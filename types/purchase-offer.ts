// types/purchase-offer.ts
// 매입 제안 관련 타입 정의 파일
// 이 파일은 도매상이 일반 사용자의 매입 요청에 대해 제시하는 매입가 데이터 모델을 정의합니다.

/**
 * 매입 제안 정보 인터페이스
 * 
 * 역경매 시스템에서 도매상이 일반 사용자의 매입 요청(SellRequest)에 대해 
 * 제시하는 매입가 제안 정보를 담고 있습니다.
 * 
 * Firestore의 'purchaseOffers' 컬렉션에 저장됩니다.
 * 
 * 블라인드 제안 시스템:
 * - 각 도매상은 다른 도매상의 제안 금액을 볼 수 없음
 * - 오직 매입 요청을 올린 본인만 모든 제안을 확인 가능
 * - 이를 통해 공정한 경쟁 환경을 조성하고 최고가 제안 유도
 * - Firestore 보안 규칙으로 접근 권한 제어
 * 
 * @interface PurchaseOffer
 * 
 * @example
 * // 도매상이 매입가를 제시하는 예시
 * const offer: PurchaseOffer = {
 *   id: "offer_abc123",
 *   sellRequestId: "req_xyz789",
 *   wholesalerId: "user_wholesaler_001",
 *   wholesalerName: "바나나컴퓨터",
 *   offerPrice: 950000,
 *   message: "맥북 프로 상태가 양호하네요. 95만원에 매입하겠습니다. 즉시 거래 가능합니다.",
 *   isSelected: false,
 *   createdAt: new Date(),
 *   updatedAt: null
 * };
 * 
 * @example
 * // 선택된 제안 (거래 확정)
 * const selectedOffer: PurchaseOffer = {
 *   id: "offer_def456",
 *   sellRequestId: "req_xyz789",
 *   wholesalerId: "user_wholesaler_002",
 *   wholesalerName: "중고나라컴퓨터",
 *   offerPrice: 1000000,
 *   message: "100만원에 매입하겠습니다.",
 *   isSelected: true,  // 일반 사용자가 이 제안을 선택함
 *   createdAt: new Date("2024-01-11"),
 *   updatedAt: new Date("2024-01-12")
 * };
 */
export interface PurchaseOffer {
  /**
   * 매입 제안의 고유 식별자
   * 
   * - Firestore에서 자동 생성되는 문서 ID
   * - purchaseOffers/{id} 경로의 문서를 식별
   * - 제안 수정/삭제 시 문서 참조에 사용
   * - 변경 불가능한 값
   * 
   * @type {string}
   * @required
   */
  id: string;

  /**
   * 매입 요청 ID (외래 키)
   * 
   * - SellRequest.id를 참조
   * - 어떤 매입 요청에 대한 제안인지 식별
   * - 하나의 매입 요청에 여러 도매상의 제안이 연결됨
   * - 쿼리 시 특정 매입 요청에 대한 모든 제안을 조회하는 데 사용
   * - Firestore 쿼리: where('sellRequestId', '==', requestId)
   * - 복합 인덱스 설정이 필요할 수 있음
   * 
   * @type {string}
   * @required
   */
  sellRequestId: string;

  /**
   * 제안한 도매상의 사용자 ID
   * 
   * - User.uid를 참조하는 외래 키
   * - 도매상(UserType.WHOLESALER)만 제안 가능
   * - 제안 수정/삭제 권한 확인에 사용 (본인만 가능)
   * - 도매상별 제안 내역 조회 시 필터링 조건
   * - 거래 확정 시 선택된 도매상 식별
   * - SellRequest.selectedWholesalerId와 연결됨
   * 
   * @type {string}
   * @required
   */
  wholesalerId: string;

  /**
   * 제안한 도매상의 이름 또는 상호명 (캐시 데이터)
   * 
   * - User.name의 복사본 (비정규화된 데이터)
   * - 제안 목록에서 도매상 정보를 빠르게 표시하기 위함
   * - users 컬렉션을 추가 조회하지 않고도 도매상 이름 표시 가능
   * - 일반 사용자가 "누구의 제안인지" 쉽게 파악
   * - 제안 등록 시점의 도매상 정보를 보존
   * 
   * @type {string}
   * @required
   */
  wholesalerName: string;

  /**
   * 제시 매입가 (원 단위)
   * 
   * - 도매상이 제안하는 매입 금액
   * - 숫자 타입으로 저장되는 매입가
   * - 단위: 대한민국 원화(KRW)
   * - 1000 = 1,000원을 의미
   * - UI에서는 toLocaleString()을 사용하여 천 단위 구분 쉼표 표시
   * - 제안 금액 순으로 정렬하여 최고가/최저가 표시
   * - 일반 사용자는 여러 제안을 비교하여 가장 좋은 조건 선택
   * - 음수 값은 허용하지 않음 (유효성 검사 필요)
   * 
   * @type {number}
   * @required
   * 
   * @example
   * 1000000  // 1,000,000원 (백만원)
   * 850000   // 850,000원
   */
  offerPrice: number;

  /**
   * 도매상이 남긴 메시지 (선택 사항)
   * 
   * - 매입가와 함께 전달하는 추가 메시지
   * - 거래 조건, 거래 방법, 연락처, 특이사항 등을 기재
   * - 일반 사용자에게 신뢰감을 주고 차별화된 제안 가능
   * - 입력하지 않아도 됨 (null 가능)
   * - 멀티라인 텍스트 지원 (줄바꿈 포함)
   * - 예: "즉시 거래 가능합니다", "직접 방문 매입 가능", "검수 후 최종 금액 확정"
   * 
   * @type {string | null | undefined}
   * @optional
   * 
   * @example
   * "상태가 양호하여 높은 가격으로 매입 가능합니다.\n" +
   * "서울/경기 지역 직접 방문 매입 가능하며,\n" +
   * "현장에서 바로 현금 결제 가능합니다.\n" +
   * "연락처: 010-1234-5678"
   */
  message?: string | null;

  /**
   * 거래 확정 여부
   * 
   * - true: 일반 사용자가 이 제안을 선택하여 거래가 확정됨
   * - false: 아직 선택되지 않은 제안 (기본값)
   * - 하나의 매입 요청에 대해 최대 1개의 제안만 isSelected: true가 됨
   * - 제안이 선택되면:
   *   * 이 필드가 true로 변경
   *   * SellRequest.status가 CLOSED로 변경
   *   * SellRequest.selectedWholesalerId가 이 제안의 wholesalerId로 설정
   *   * SellRequest.closedAt이 현재 시간으로 기록
   * - 선택되지 않은 다른 제안들은 false로 유지됨
   * 
   * @type {boolean}
   * @required
   * 
   * @example
   * // 일반 제안
   * isSelected: false
   * 
   * // 선택된 제안 (거래 확정)
   * isSelected: true
   */
  isSelected: boolean;

  /**
   * 제안 생성 일시
   * 
   * - 도매상이 매입가 제안을 처음 등록한 시각
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - 제안 순서 정렬에 사용
   * - 매입 요청에 얼마나 빨리 제안이 들어왔는지 확인
   * - 변경되지 않는 값
   * 
   * @type {Date}
   * @required
   */
  createdAt: Date;

  /**
   * 마지막 수정 일시 (선택 사항)
   * 
   * - 제안 정보가 마지막으로 업데이트된 시각
   * - 매입가 수정, 메시지 수정, 선택 여부 변경 시 갱신
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - 처음 등록 시에는 null
   * - 제안이 선택될 때(isSelected: true) 이 값도 업데이트됨
   * - 수정 이력 추적에 사용
   * 
   * @type {Date | null | undefined}
   * @optional
   */
  updatedAt?: Date | null;
}
