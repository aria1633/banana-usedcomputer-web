// types/inquiry.ts
// 상품 문의 관련 타입 정의 파일
// 이 파일은 고객이 상품에 대해 판매자에게 질문하는 문의 시스템의 데이터 모델을 정의합니다.

/**
 * 문의 처리 상태 열거형
 * 
 * 상품 문의의 답변 진행 상태를 나타냅니다.
 * 문의가 등록되면 PENDING 상태로 시작하며, 판매자가 답변을 작성하면 ANSWERED로 변경됩니다.
 * 
 * @enum {string}
 * 
 * - PENDING: 답변 대기 중
 *   * 고객이 문의를 등록한 직후의 초기 상태
 *   * 판매자가 아직 답변을 작성하지 않음
 *   * 판매자의 답변이 필요한 상태
 *   * UI에서 "답변 대기", "미답변" 등으로 표시
 * 
 * - ANSWERED: 답변 완료
 *   * 판매자가 answer 필드에 답변을 작성함
 *   * answeredAt에 답변 작성 시각이 기록됨
 *   * UI에서 "답변 완료" 표시 및 답변 내용 표시
 *   * 답변 후에도 추가 질문을 위해 재문의 가능 (새 Inquiry 생성)
 */
export enum InquiryStatus {
  PENDING = 'pending',   // 답변 대기 중
  ANSWERED = 'answered', // 답변 완료
}

/**
 * 제품 문의 정보 인터페이스
 * 
 * 고객이 특정 상품에 대해 판매자에게 질문하는 1:1 문의 시스템입니다.
 * Firestore의 'inquiries' 컬렉션에 저장됩니다.
 * 
 * 문의 프로세스:
 * 1. 고객이 상품 상세 페이지에서 문의 작성
 * 2. 문의가 PENDING 상태로 등록됨
 * 3. 판매자(도매상)가 자신의 상품에 대한 문의 목록 확인
 * 4. 판매자가 답변 작성
 * 5. 상태가 ANSWERED로 변경되고 고객이 답변 확인
 * 
 * @interface Inquiry
 * 
 * @example
 * // 새로운 문의 등록 예시
 * const newInquiry: Inquiry = {
 *   id: "inq_abc123",
 *   productId: "prod_xyz789",
 *   productTitle: "삼성 노트북 NT950XCJ 중고",
 *   customerId: "user_normal_001",
 *   customerName: "홍길동",
 *   sellerId: "user_wholesaler_001",
 *   sellerName: "바나나컴퓨터",
 *   question: "배터리 상태가 어떤가요? 배터리 사이클 횟수를 알 수 있을까요?",
 *   answer: null,
 *   status: InquiryStatus.PENDING,
 *   createdAt: new Date(),
 *   answeredAt: null
 * };
 * 
 * @example
 * // 답변이 완료된 문의
 * const answeredInquiry: Inquiry = {
 *   id: "inq_def456",
 *   productId: "prod_xyz789",
 *   productTitle: "삼성 노트북 NT950XCJ 중고",
 *   customerId: "user_normal_002",
 *   customerName: "김철수",
 *   sellerId: "user_wholesaler_001",
 *   sellerName: "바나나컴퓨터",
 *   question: "직접 방문해서 확인 가능한가요?",
 *   answer: "네, 가능합니다. 서울 강남구 매장으로 방문하시면 직접 확인하실 수 있습니다. 방문 전에 전화 주시면 감사하겠습니다.",
 *   status: InquiryStatus.ANSWERED,
 *   createdAt: new Date("2024-01-10"),
 *   answeredAt: new Date("2024-01-10T14:30:00")
 * };
 */
export interface Inquiry {
  /**
   * 문의의 고유 식별자
   * 
   * - Firestore에서 자동 생성되는 문서 ID
   * - inquiries/{id} 경로의 문서를 식별
   * - 문의 수정/삭제 시 문서 참조에 사용
   * - 변경 불가능한 값
   * 
   * @type {string}
   * @required
   */
  id: string;

  /**
   * 문의 대상 상품의 ID (외래 키)
   * 
   * - Product.id를 참조
   * - 어떤 상품에 대한 문의인지 식별
   * - 상품 상세 페이지에서 해당 상품의 모든 문의 조회 시 사용
   * - Firestore 쿼리: where('productId', '==', productId)
   * - 상품이 삭제되어도 문의 기록은 유지됨
   * 
   * @type {string}
   * @required
   */
  productId: string;

  /**
   * 제품명 (캐시 데이터)
   * 
   * - Product.title의 복사본 (비정규화된 데이터)
   * - 문의 목록에서 어떤 상품에 대한 문의인지 빠르게 표시
   * - products 컬렉션을 추가 조회하지 않고도 상품명 표시 가능
   * - 문의 등록 시점의 상품명을 보존
   * - 상품명이 변경되어도 문의의 제품명은 유지됨 (의도된 동작)
   * 
   * @type {string}
   * @required
   */
  productTitle: string;

  /**
   * 문의 작성자(고객)의 사용자 ID
   * 
   * - User.uid를 참조하는 외래 키
   * - 문의를 작성한 고객을 식별
   * - 문의 수정/삭제 권한 확인에 사용 (본인만 가능)
   * - 고객별 문의 내역 조회 시 필터링 조건
   * - 일반 사용자(NORMAL)와 도매상(WHOLESALER) 모두 문의 작성 가능
   * 
   * @type {string}
   * @required
   */
  customerId: string;

  /**
   * 문의 작성자(고객)의 이름 (캐시 데이터)
   * 
   * - User.name의 복사본 (비정규화된 데이터)
   * - 문의 목록에서 작성자 정보를 빠르게 표시
   * - 판매자가 "누가 문의했는지" 쉽게 파악
   * - 문의 등록 시점의 고객 이름을 보존
   * 
   * @type {string}
   * @required
   */
  customerName: string;

  /**
   * 판매자(도매상)의 사용자 ID
   * 
   * - User.uid를 참조하는 외래 키
   * - Product.sellerId와 동일한 값
   * - 답변을 작성할 판매자를 식별
   * - 판매자별 받은 문의 목록 조회 시 필터링 조건
   * - Firestore 쿼리: where('sellerId', '==', currentUserId)
   * - 답변 작성 권한 확인에 사용 (해당 판매자만 가능)
   * 
   * @type {string}
   * @required
   */
  sellerId: string;

  /**
   * 판매자(도매상)의 이름 또는 상호명 (캐시 데이터)
   * 
   * - User.name의 복사본 (비정규화된 데이터)
   * - Product.sellerName과 동일한 값
   * - 고객이 "어느 판매자에게 문의했는지" 쉽게 파악
   * - 문의 목록에서 판매자 정보를 빠르게 표시
   * 
   * @type {string}
   * @required
   */
  sellerName: string;

  /**
   * 문의 내용 (질문)
   * 
   * - 고객이 작성한 질문 또는 문의 사항
   * - 상품에 대한 궁금한 점, 거래 방법, 추가 정보 요청 등
   * - 멀티라인 텍스트 지원 (줄바꿈 포함)
   * - 상세하고 명확하게 작성할수록 정확한 답변을 받을 수 있음
   * - 문의 내용은 등록 후 수정 가능 (답변 전에만)
   * 
   * @type {string}
   * @required
   * 
   * @example
   * "안녕하세요. 이 노트북에 대해 문의드립니다.\n\n" +
   * "1. 배터리 상태가 어떤가요?\n" +
   * "2. 키보드에 하자는 없나요?\n" +
   * "3. 직접 방문해서 테스트 가능한가요?\n\n" +
   * "답변 부탁드립니다."
   */
  question: string;

  /**
   * 답변 내용 (선택 사항)
   * 
   * - 판매자가 작성한 답변
   * - 문의 등록 직후에는 null (PENDING 상태)
   * - 판매자가 답변을 작성하면 이 필드에 저장됨
   * - 답변 작성 시 status가 ANSWERED로 변경
   * - 멀티라인 텍스트 지원 (줄바꿈 포함)
   * - 답변 후에도 수정 가능
   * - 친절하고 상세한 답변이 거래 성사에 도움됨
   * 
   * @type {string | null | undefined}
   * @optional
   * 
   * @example
   * "문의 감사합니다.\n\n" +
   * "1. 배터리는 사이클 80회로 양호한 상태입니다.\n" +
   * "2. 키보드는 모든 키가 정상 작동하며 하자 없습니다.\n" +
   * "3. 네, 서울 강남구 매장에서 직접 확인 가능합니다.\n" +
   * "   방문 전 010-1234-5678로 연락 주시면 감사하겠습니다.\n\n" +
   * "추가 궁금한 점 있으시면 언제든 문의해주세요."
   */
  answer?: string | null;

  /**
   * 문의 처리 상태
   * 
   * - InquiryStatus enum 값 중 하나
   * - 문의 등록 시 기본값: InquiryStatus.PENDING
   * - 답변 작성 시 InquiryStatus.ANSWERED로 변경
   * - 판매자는 PENDING 문의를 우선적으로 확인
   * - 목록 필터링 시 상태별로 분류 가능
   * - UI에서 답변 여부를 시각적으로 표시
   * 
   * @type {InquiryStatus}
   * @required
   * @see InquiryStatus
   */
  status: InquiryStatus;

  /**
   * 문의 작성 일시
   * 
   * - 고객이 문의를 처음 등록한 시각
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - 최신 문의 순으로 정렬에 사용
   * - "N시간 전", "N일 전" 같은 상대적 시간 표시
   * - 변경되지 않는 값
   * 
   * @type {Date}
   * @required
   */
  createdAt: Date;

  /**
   * 답변 작성 일시 (선택 사항)
   * 
   * - 판매자가 답변을 작성한 시각
   * - PENDING 상태일 때는 null
   * - 답변 작성 시 현재 시각으로 설정됨
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - createdAt과 answeredAt의 차이로 응답 속도 계산 가능
   * - 답변이 빠를수록 고객 만족도 향상
   * 
   * @type {Date | null | undefined}
   * @optional
   * 
   * @example
   * // 답변 대기 중
   * answeredAt: null
   * 
   * // 답변 완료
   * answeredAt: new Date("2024-01-10T15:30:00")
   */
  answeredAt?: Date | null;
}
