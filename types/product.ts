// types/product.ts
// 상품 관련 타입 정의 파일
// 이 파일은 도매상이 등록하는 중고 컴퓨터 상품의 데이터 모델을 정의합니다.

/**
 * 중고 컴퓨터 제품 정보 인터페이스
 * 
 * Firestore의 'products' 컬렉션에 저장되는 상품 문서의 구조를 정의합니다.
 * 도매상(WHOLESALER) 권한을 가진 사용자만 상품을 등록하고 관리할 수 있습니다.
 * 
 * @interface Product
 * 
 * @example
 * // 상품 등록 예시
 * const product: Product = {
 *   id: "prod_abc123",
 *   sellerId: "user_wholesaler_001",
 *   sellerName: "바나나컴퓨터",
 *   title: "삼성 노트북 NT950XCJ 중고",
 *   description: "2021년식 삼성 노트북입니다. i7 프로세서, 16GB RAM, 512GB SSD 장착. 외관 깨끗하고 정상 작동합니다.",
 *   price: 650000,
 *   quantity: 5,
 *   imageUrls: [
 *     "https://storage.googleapis.com/bucket/product1-front.jpg",
 *     "https://storage.googleapis.com/bucket/product1-side.jpg"
 *   ],
 *   category: "노트북",
 *   isAvailable: true,
 *   createdAt: new Date("2024-01-15"),
 *   updatedAt: null
 * };
 */
export interface Product {
  /**
   * Firestore 문서의 고유 식별자
   * 
   * - Firestore에서 자동 생성되는 문서 ID
   * - products/{id} 경로의 문서를 식별
   * - URL 파라미터로 사용되어 상품 상세 페이지 라우팅에 활용 (/products/[id])
   * - 문의(Inquiry)나 주문 등 다른 문서에서 참조할 때 사용
   * - 변경 불가능한 값
   * 
   * @type {string}
   * @required
   */
  id: string;

  /**
   * 판매자(도매상)의 사용자 ID
   * 
   * - User.uid를 참조하는 외래 키
   * - 상품을 등록한 도매상을 식별
   * - 상품 수정/삭제 권한 확인에 사용 (본인만 수정 가능)
   * - 판매자별 상품 목록 조회 시 필터링 조건으로 사용
   * - 문의 발생 시 판매자에게 알림을 보내는 용도
   * 
   * @type {string}
   * @required
   */
  sellerId: string;

  /**
   * 판매자 이름 또는 상호명 (캐시 데이터)
   * 
   * - User.name의 복사본 (비정규화된 데이터)
   * - 상품 목록에서 판매자 정보를 빠르게 표시하기 위한 목적
   * - users 컬렉션을 추가 조회하지 않고도 판매자 이름을 보여줄 수 있음
   * - 판매자가 이름을 변경해도 이 값은 자동 업데이트되지 않음 (의도된 동작)
   * - 상품 등록 시점의 판매자 정보를 보존
   * 
   * @type {string}
   * @required
   */
  sellerName: string;

  /**
   * 제품명
   * 
   * - 상품의 제목으로 사용됨
   * - 검색 시 주요 검색 대상 필드
   * - 상품 목록 페이지와 상세 페이지의 메인 타이틀로 표시
   * - 예: "삼성 갤럭시북 프로 360 중고", "LG 그램 17인치 노트북"
   * - 간결하면서도 제품의 핵심 정보를 포함하는 것이 좋음
   * 
   * @type {string}
   * @required
   */
  title: string;

  /**
   * 제품 상세 설명
   * 
   * - 제품의 자세한 정보를 텍스트로 기술
   * - 사양, 상태, 사용 기간, 특이사항 등을 포함
   * - 구매자가 제품을 정확히 이해할 수 있도록 작성
   * - 멀티라인 텍스트 지원 (줄바꿈 포함 가능)
   * - 상세 페이지에서 주요 콘텐츠로 표시됨
   * - 검색 기능에도 활용될 수 있음
   * 
   * @type {string}
   * @required
   * 
   * @example
   * "2021년 출시된 삼성 노트북입니다.\n\n" +
   * "사양:\n" +
   * "- CPU: Intel i7-1165G7\n" +
   * "- RAM: 16GB DDR4\n" +
   * "- 저장장치: 512GB NVMe SSD\n" +
   * "- 화면: 15.6인치 FHD\n\n" +
   * "상태: 외관 A급, 배터리 효율 85% 이상"
   */
  description: string;

  /**
   * 제품 가격 (원 단위)
   * 
   * - 숫자 타입으로 저장되는 판매 가격
   * - 단위: 대한민국 원화(KRW)
   * - 1000 = 1,000원을 의미
   * - UI에서는 toLocaleString()을 사용하여 천 단위 구분 쉼표 표시
   * - 가격 범위 필터링, 정렬 등에 사용
   * - 음수 값은 허용하지 않음 (유효성 검사 필요)
   * 
   * @type {number}
   * @required
   * 
   * @example
   * 650000  // 650,000원으로 표시됨
   */
  price: number;

  /**
   * 재고 수량
   * 
   * - 현재 판매 가능한 제품의 개수
   * - 0 이상의 정수 값
   * - 재고가 0이면 품절 상태로 표시
   * - 주문이 발생하면 감소, 재입고 시 증가
   * - 재고 관리 및 품절 여부 판단에 사용
   * - isAvailable과 함께 판매 가능 여부 결정
   * 
   * @type {number}
   * @required
   * 
   * @example
   * 5  // 5개 재고 있음
   * 0  // 품절
   */
  quantity: number;

  /**
   * 제품 이미지 URL 배열
   * 
   * - Firebase Storage에 업로드된 이미지들의 다운로드 URL
   * - 배열의 첫 번째 이미지가 대표 이미지(썸네일)로 사용됨
   * - 여러 장의 이미지를 등록하여 다양한 각도에서 제품을 보여줄 수 있음
   * - 빈 배열일 수도 있지만, 최소 1장 이상 권장
   * - 이미지 순서가 중요함 (배열 순서대로 표시)
   * - 상품 등록 시 파일을 업로드하고 URL을 저장
   * 
   * @type {string[]}
   * @required
   * 
   * @example
   * [
   *   "https://firebasestorage.googleapis.com/.../product-front.jpg",
   *   "https://firebasestorage.googleapis.com/.../product-side.jpg",
   *   "https://firebasestorage.googleapis.com/.../product-back.jpg"
   * ]
   */
  imageUrls: string[];

  /**
   * 제품 카테고리
   * 
   * - 상품을 분류하는 카테고리명
   * - 카테고리별 필터링 및 탐색에 사용
   * - 일반적인 카테고리 예시:
   *   * "노트북"
   *   * "데스크탑"
   *   * "모니터"
   *   * "키보드/마우스"
   *   * "주변기기"
   * - 추후 enum으로 변경하여 카테고리를 고정할 수도 있음
   * - 카테고리 네비게이션 메뉴 구성에 활용
   * 
   * @type {string}
   * @required
   */
  category: string;

  /**
   * 판매 가능 여부 플래그
   * 
   * - true: 현재 판매 중 (구매 가능)
   * - false: 판매 중지 (임시 품절, 판매자가 직접 중지 등)
   * - quantity가 0보다 크더라도 isAvailable이 false면 구매 불가
   * - 판매자가 상품을 일시적으로 비활성화할 때 사용
   * - 상품 목록 필터링 시 isAvailable === true인 상품만 표시
   * - 상품을 삭제하지 않고 숨길 수 있는 soft delete 역할
   * 
   * @type {boolean}
   * @required
   * 
   * @example
   * // 재고가 있지만 판매 중지한 경우
   * { quantity: 10, isAvailable: false }
   * 
   * // 재고가 없어서 판매 불가능한 경우
   * { quantity: 0, isAvailable: true }
   */
  isAvailable: boolean;

  /**
   * 제품 등록 일시
   * 
   * - 도매상이 상품을 처음 등록한 시각
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - 신상품 정렬, 최근 등록 상품 표시 등에 활용
   * - 상품 관리 페이지에서 등록 날짜 표시
   * - 변경되지 않는 값
   * 
   * @type {Date}
   * @required
   */
  createdAt: Date;

  /**
   * 마지막 수정 일시 (선택 사항)
   * 
   * - 상품 정보가 마지막으로 업데이트된 시각
   * - 가격, 재고, 설명 등 상품 정보 변경 시 갱신
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - 처음 등록 시에는 null
   * - 상품 수정 이력 추적에 사용
   * - "정보 업데이트: X일 전" 같은 UI 표시에 활용
   * 
   * @type {Date | null | undefined}
   * @optional
   */
  updatedAt?: Date | null;
}
