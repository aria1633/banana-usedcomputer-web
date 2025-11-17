// types/sell-request.ts
// 매입 요청 관련 타입 정의 파일
// 이 파일은 일반 사용자가 중고 컴퓨터 매입을 요청하는 역경매 시스템의 데이터 모델을 정의합니다.

/**
 * 매입 요청 카테고리 열거형
 *
 * 사용자가 매입 요청할 수 있는 제품의 카테고리를 정의합니다.
 *
 * @enum {string}
 *
 * - COMPUTER: 컴퓨터 관련 기기 및 부품 (노트북, 데스크탑, 모니터, 키보드, 마우스 등)
 * - SMARTPHONE: 스마트폰 및 태블릿
 */
export enum SellRequestCategory {
  COMPUTER = 'computer',     // 컴퓨터 관련 기기 및 부품
  SMARTPHONE = 'smartphone', // 스마트폰 및 태블릿
}

/**
 * 매입 요청 상태 열거형
 * 
 * 일반 사용자가 등록한 매입 요청의 현재 진행 상태를 나타냅니다.
 * 역경매 프로세스의 라이프사이클을 관리합니다.
 * 
 * @enum {string}
 * 
 * - OPEN: 매입 요청이 활성화되어 있고 도매상들의 제안을 받고 있는 상태
 *   * 일반 사용자가 매입 요청을 등록한 직후
 *   * 도매상들이 목록에서 확인하고 매입가를 제시할 수 있음
 *   * 여러 도매상으로부터 PurchaseOffer를 받을 수 있음
 *   * 일반 사용자는 받은 제안들을 비교하고 선택 가능
 * 
 * - CLOSED: 거래가 완료되었거나 요청이 종료된 상태
 *   * 일반 사용자가 도매상의 제안 중 하나를 선택하여 거래 확정
 *   * 또는 만족스러운 제안이 없어 요청을 종료
 *   * selectedWholesalerId가 있으면 거래 성사, 없으면 그냥 종료
 *   * closedAt 시간 기록됨
 *   * 더 이상 새로운 제안을 받지 않음
 * 
 * - CANCELLED: 사용자가 거래 전 요청을 취소한 상태
 *   * 일반 사용자가 매입 요청을 철회
 *   * 실수로 등록했거나, 다른 경로로 판매가 결정된 경우
 *   * 이미 받은 제안들도 무효화됨
 *   * 취소된 요청은 목록에서 표시되지 않거나 '취소됨' 표시
 */
export enum SellRequestStatus {
  OPEN = 'open',           // 진행 중 (제안 받는 중)
  CLOSED = 'closed',       // 종료됨 (거래 완료 또는 종료)
  CANCELLED = 'cancelled', // 취소됨
}

/**
 * 매입 요청 정보 인터페이스
 * 
 * 역경매 시스템의 핵심 데이터 구조입니다.
 * Firestore의 'sellRequests' 컬렉션에 저장됩니다.
 * 
 * 역경매 시스템 흐름:
 * 1. 일반 사용자(NORMAL)가 팔고 싶은 중고 컴퓨터 정보를 등록
 * 2. 여러 도매상(WHOLESALER)들이 이 요청을 보고 매입가를 제시 (PurchaseOffer)
 * 3. 일반 사용자가 제안들을 비교하여 가장 좋은 조건의 도매상을 선택
 * 4. 거래 확정 또는 요청 종료
 * 
 * @interface SellRequest
 * 
 * @example
 * // 매입 요청 등록 예시
 * const sellRequest: SellRequest = {
 *   id: "req_abc123",
 *   sellerId: "user_normal_001",
 *   sellerName: "홍길동",
 *   title: "맥북 프로 2020 매입 요청",
 *   description: "맥북 프로 13인치 2020년형입니다.\n사양: M1 칩, 8GB RAM, 256GB SSD\n상태: 외관 양호, 정상 작동, 배터리 사이클 50회\n박스와 충전기 포함",
 *   imageUrls: [
 *     "https://storage.googleapis.com/.../macbook-front.jpg",
 *     "https://storage.googleapis.com/.../macbook-screen.jpg"
 *   ],
 *   desiredPrice: "1,000,000원 정도 희망",
 *   status: SellRequestStatus.OPEN,
 *   selectedWholesalerId: null,
 *   createdAt: new Date(),
 *   updatedAt: null,
 *   closedAt: null
 * };
 * 
 * @example
 * // 거래가 확정된 매입 요청
 * const closedRequest: SellRequest = {
 *   id: "req_xyz789",
 *   sellerId: "user_normal_002",
 *   sellerName: "김철수",
 *   title: "삼성 노트북 매입 요청",
 *   description: "...",
 *   imageUrls: ["..."],
 *   desiredPrice: null,
 *   status: SellRequestStatus.CLOSED,
 *   selectedWholesalerId: "user_wholesaler_003", // 선택된 도매상
 *   createdAt: new Date("2024-01-10"),
 *   updatedAt: new Date("2024-01-12"),
 *   closedAt: new Date("2024-01-12")
 * };
 */
export interface SellRequest {
  /**
   * 매입 요청의 고유 식별자
   * 
   * - Firestore에서 자동 생성되는 문서 ID
   * - sellRequests/{id} 경로의 문서를 식별
   * - URL 라우팅에 사용 (/sell-requests/[id])
   * - PurchaseOffer 문서에서 sellRequestId로 참조됨
   * - 변경 불가능한 값
   * 
   * @type {string}
   * @required
   */
  id: string;

  /**
   * 매입 요청을 등록한 일반 사용자의 ID
   * 
   * - User.uid를 참조하는 외래 키
   * - 일반 사용자(UserType.NORMAL)만 매입 요청 가능
   * - 요청 수정/삭제 권한 확인에 사용 (본인만 가능)
   * - 사용자별 매입 요청 목록 조회 시 필터링 조건
   * - 거래 확정 시 연락처 정보 조회 용도
   * 
   * @type {string}
   * @required
   */
  sellerId: string;

  /**
   * 매입 요청한 사용자의 이름 (캐시 데이터)
   * 
   * - User.name의 복사본 (비정규화된 데이터)
   * - 매입 요청 목록에서 작성자 정보를 빠르게 표시하기 위함
   * - users 컬렉션을 추가 조회하지 않고도 사용자 이름 표시 가능
   * - 요청 등록 시점의 사용자 이름을 보존
   * - 도매상들이 누가 올린 요청인지 확인할 수 있음
   * 
   * @type {string}
   * @required
   */
  sellerName: string;

  /**
   * 매입 요청 제목
   * 
   * - 매입 요청의 간략한 제목
   * - 매입 요청 목록에서 메인 타이틀로 표시
   * - 검색 기능의 주요 대상 필드
   * - 제품의 종류와 브랜드를 포함하는 것이 좋음
   * - 예: "맥북 에어 2021 매입 요청", "LG 그램 노트북 매입해주세요"
   * 
   * @type {string}
   * @required
   */
  title: string;

  /**
   * 매입 요청 상세 설명
   * 
   * - 판매하려는 제품의 자세한 정보
   * - 제품 사양, 구입 시기, 사용 기간, 외관 상태, 동작 상태, 포함 구성품 등
   * - 도매상들이 정확한 매입가를 제시할 수 있도록 상세하게 작성
   * - 멀티라인 텍스트 지원 (줄바꿈 포함)
   * - 상세 페이지에서 주요 콘텐츠로 표시
   * - 정보가 자세할수록 더 정확한 매입가 제안을 받을 수 있음
   * 
   * @type {string}
   * @required
   * 
   * @example
   * "2020년에 구입한 맥북 프로입니다.\n\n" +
   * "사양:\n" +
   * "- CPU: Intel Core i5\n" +
   * "- RAM: 16GB\n" +
   * "- SSD: 512GB\n" +
   * "- 화면: 13.3인치 레티나\n\n" +
   * "상태:\n" +
   * "- 외관: 스크래치 없이 깨끗함\n" +
   * "- 배터리: 사이클 120회\n" +
   * "- 동작: 모든 기능 정상\n" +
   * "- 구성품: 본체, 충전기, 박스 포함"
   */
  description: string;

  /**
   * 제품 이미지 URL 배열
   * 
   * - Firebase Storage에 업로드된 제품 사진들의 다운로드 URL
   * - 배열의 첫 번째 이미지가 대표 이미지(썸네일)
   * - 다양한 각도에서 촬영한 사진들을 포함하면 좋음
   * - 외관 상태, 화면, 키보드, 박스 등의 사진
   * - 이미지를 통해 도매상들이 정확한 상태를 파악
   * - 빈 배열일 수도 있지만, 최소 2-3장 이상 권장
   * - 이미지 순서가 중요함 (배열 순서대로 표시)
   * 
   * @type {string[]}
   * @required
   * 
   * @example
   * [
   *   "https://firebasestorage.googleapis.com/.../laptop-front.jpg",
   *   "https://firebasestorage.googleapis.com/.../laptop-screen-on.jpg",
   *   "https://firebasestorage.googleapis.com/.../laptop-keyboard.jpg",
   *   "https://firebasestorage.googleapis.com/.../laptop-bottom.jpg"
   * ]
   */
  imageUrls: string[];

  /**
   * 희망 매입가 (선택 사항)
   *
   * - 사용자가 원하는 매입 가격 또는 가격대
   * - 문자열 타입으로 자유롭게 입력 가능
   * - 정확한 금액이 아닌 대략적인 기대치를 적을 수 있음
   * - 예: "100만원 정도", "80~90만원", "최소 70만원"
   * - 입력하지 않아도 됨 (null 가능)
   * - 이 값은 참고용이며, 실제 매입가는 도매상들이 제시
   * - 너무 높게 적으면 제안이 오지 않을 수 있음
   *
   * @type {string | null | undefined}
   * @optional
   *
   * @example
   * "1,000,000원 이상 희망"
   * "80만원~100만원 사이"
   * null  // 희망가 미입력
   */
  desiredPrice?: string | null;

  /**
   * 매입 요청 카테고리
   *
   * - SellRequestCategory enum 값 중 하나
   * - 컴퓨터 관련 기기 또는 스마트폰 구분
   * - 도매상들이 자신의 전문 분야에 맞는 요청을 찾을 수 있도록 도움
   * - 카테고리별 필터링 및 통계에 사용
   *
   * @type {SellRequestCategory}
   * @required
   *
   * @example
   * SellRequestCategory.COMPUTER
   * SellRequestCategory.SMARTPHONE
   */
  category: SellRequestCategory;

  /**
   * 매입 요청의 현재 상태
   * 
   * - SellRequestStatus enum 값 중 하나
   * - 역경매 프로세스의 현재 단계를 나타냄
   * - 등록 직후: SellRequestStatus.OPEN
   * - 거래 확정 또는 종료: SellRequestStatus.CLOSED
   * - 사용자가 취소: SellRequestStatus.CANCELLED
   * - 목록 필터링 시 OPEN 상태인 요청만 표시
   * - 상태에 따라 UI와 가능한 액션이 달라짐
   * 
   * @type {SellRequestStatus}
   * @required
   * @see SellRequestStatus
   */
  status: SellRequestStatus;

  /**
   * 선택된 도매상의 ID (거래 확정 시)
   * 
   * - 일반 사용자가 여러 제안 중 선택한 도매상의 User.uid
   * - 거래가 확정되면 이 값이 설정되고 status가 CLOSED로 변경됨
   * - null: 아직 선택하지 않았거나, 제안 없이 종료된 경우
   * - 값이 있으면 해당 도매상과 거래가 성사된 것
   * - PurchaseOffer 중 선택된 제안의 wholesalerId와 일치
   * - 거래 내역 추적 및 통계에 사용
   * 
   * @type {string | null | undefined}
   * @optional
   * 
   * @example
   * // 거래 확정 전
   * selectedWholesalerId: null
   * 
   * // 거래 확정 후
   * selectedWholesalerId: "user_wholesaler_005"
   */
  selectedWholesalerId?: string | null;

  /**
   * 매입 요청 생성 일시
   * 
   * - 일반 사용자가 매입 요청을 처음 등록한 시각
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - 최신 요청 정렬에 사용
   * - "N일 전 등록" 같은 상대적 시간 표시에 활용
   * - 변경되지 않는 값
   * 
   * @type {Date}
   * @required
   */
  createdAt: Date;

  /**
   * 마지막 수정 일시 (선택 사항)
   * 
   * - 매입 요청 정보가 마지막으로 업데이트된 시각
   * - 내용 수정, 상태 변경 시 갱신
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - 처음 등록 시에는 null
   * - 수정 이력 추적에 사용
   * 
   * @type {Date | null | undefined}
   * @optional
   */
  updatedAt?: Date | null;

  /**
   * 요청 종료 일시 (선택 사항)
   * 
   * - 매입 요청이 CLOSED 또는 CANCELLED 상태가 된 시각
   * - 거래 확정 시점 또는 취소 시점을 기록
   * - OPEN 상태일 때는 null
   * - 요청이 얼마나 빨리 처리되었는지 통계 분석에 활용
   * - createdAt과 closedAt의 차이로 처리 소요 시간 계산 가능
   * 
   * @type {Date | null | undefined}
   * @optional
   * 
   * @example
   * // 진행 중인 요청
   * closedAt: null
   * 
   * // 거래 완료된 요청
   * closedAt: new Date("2024-01-15T14:30:00")
   */
  closedAt?: Date | null;
}
