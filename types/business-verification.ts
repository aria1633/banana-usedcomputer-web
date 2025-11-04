// types/business-verification.ts
// 사업자 인증 관련 타입 정의 파일
// 이 파일은 일반 사용자가 도매상이 되기 위해 신청하는 사업자 인증 시스템의 데이터 모델을 정의합니다.

/**
 * 사업자 인증 승인 상태 열거형
 * 
 * 사업자 인증 신청의 현재 처리 상태를 나타냅니다.
 * 관리자가 사업자등록증을 검토하고 승인/거부를 결정합니다.
 * 
 * @enum {string}
 * 
 * - PENDING: 승인 대기 중
 *   * 일반 사용자가 사업자 인증을 신청한 직후의 초기 상태
 *   * 관리자의 검토를 기다리는 중
 *   * 사업자등록증이 제출되었지만 아직 확인되지 않음
 *   * 이 상태에서는 도매상 권한을 얻을 수 없음
 * 
 * - APPROVED: 승인 완료
 *   * 관리자가 사업자등록증을 검토하고 승인함
 *   * User.verificationStatus가 APPROVED로 변경
 *   * User.userType이 WHOLESALER로 변경
 *   * 이후 상품 등록, 매입 제안 등 도매상 기능 사용 가능
 *   * processedAt에 승인 시각 기록
 *   * processedBy에 승인한 관리자 ID 기록
 * 
 * - REJECTED: 승인 거부
 *   * 사업자등록증이 유효하지 않거나 정보가 일치하지 않음
 *   * rejectionReason에 거부 사유가 기재됨
 *   * User.verificationStatus가 REJECTED로 변경
 *   * 사용자는 거부 사유를 확인하고 재신청 가능
 *   * 재신청 시 새로운 BusinessVerification 문서 생성
 */
export enum BusinessVerificationStatus {
  PENDING = 'pending',   // 승인 대기 중
  APPROVED = 'approved', // 승인 완료
  REJECTED = 'rejected', // 승인 거부
}

/**
 * 사업자 인증 신청 정보 인터페이스
 * 
 * 일반 사용자가 도매상 권한을 얻기 위해 제출하는 사업자 인증 신청 정보입니다.
 * Firestore의 'businessVerifications' 컬렉션에 저장됩니다.
 * 
 * 사업자 인증 프로세스:
 * 1. 일반 사용자(UserType.NORMAL)가 사업자등록증과 사업자 정보를 입력하여 신청
 * 2. 사업자등록증 이미지가 Firebase Storage에 업로드됨
 * 3. BusinessVerification 문서가 PENDING 상태로 생성됨
 * 4. 관리자(UserType.ADMIN)가 신청 목록에서 확인
 * 5. 관리자가 사업자등록증의 진위와 정보 일치 여부를 검토
 * 6. 승인 시: status를 APPROVED로 변경하고 User 문서도 업데이트
 * 7. 거부 시: status를 REJECTED로 변경하고 거부 사유 입력
 * 
 * @interface BusinessVerification
 * 
 * @example
 * // 신청 직후 (PENDING 상태)
 * const newApplication: BusinessVerification = {
 *   id: "biz_abc123",
 *   userId: "user_normal_001",
 *   userName: "홍길동",
 *   businessNumber: "123-45-67890",
 *   companyName: "바나나컴퓨터",
 *   representativeName: "홍길동",
 *   documentUrl: "https://storage.googleapis.com/.../business-license.jpg",
 *   status: BusinessVerificationStatus.PENDING,
 *   rejectionReason: null,
 *   createdAt: new Date(),
 *   processedAt: null,
 *   processedBy: null
 * };
 * 
 * @example
 * // 승인된 신청
 * const approvedApplication: BusinessVerification = {
 *   id: "biz_def456",
 *   userId: "user_normal_002",
 *   userName: "김철수",
 *   businessNumber: "987-65-43210",
 *   companyName: "중고나라컴퓨터",
 *   representativeName: "김철수",
 *   documentUrl: "https://storage.googleapis.com/.../license2.jpg",
 *   status: BusinessVerificationStatus.APPROVED,
 *   rejectionReason: null,
 *   createdAt: new Date("2024-01-10"),
 *   processedAt: new Date("2024-01-11T10:30:00"),
 *   processedBy: "admin_user_001"
 * };
 * 
 * @example
 * // 거부된 신청
 * const rejectedApplication: BusinessVerification = {
 *   id: "biz_ghi789",
 *   userId: "user_normal_003",
 *   userName: "이영희",
 *   businessNumber: "111-22-33333",
 *   companyName: "테스트상회",
 *   representativeName: "이영희",
 *   documentUrl: "https://storage.googleapis.com/.../license3.jpg",
 *   status: BusinessVerificationStatus.REJECTED,
 *   rejectionReason: "제출하신 사업자등록증의 상호명이 신청 정보와 일치하지 않습니다. 정확한 정보로 재신청 부탁드립니다.",
 *   createdAt: new Date("2024-01-12"),
 *   processedAt: new Date("2024-01-13T09:15:00"),
 *   processedBy: "admin_user_001"
 * };
 */
export interface BusinessVerification {
  /**
   * 사업자 인증 신청의 고유 식별자
   * 
   * - Firestore에서 자동 생성되는 문서 ID
   * - businessVerifications/{id} 경로의 문서를 식별
   * - 관리자가 특정 신청을 조회/처리할 때 사용
   * - 변경 불가능한 값
   * 
   * @type {string}
   * @required
   */
  id: string;

  /**
   * 신청자의 사용자 ID
   * 
   * - User.uid를 참조하는 외래 키
   * - 일반 사용자(UserType.NORMAL)가 신청
   * - 신청 수정/취소 권한 확인에 사용 (본인만 가능)
   * - 한 사용자가 여러 번 신청 가능 (거부 후 재신청)
   * - 사용자별 신청 이력 조회 시 필터링 조건
   * - 승인 시 이 userId의 User 문서를 업데이트하여 도매상 권한 부여
   * 
   * @type {string}
   * @required
   */
  userId: string;

  /**
   * 신청자의 이름 (캐시 데이터)
   * 
   * - User.name의 복사본 (비정규화된 데이터)
   * - 관리자가 신청 목록에서 신청자를 빠르게 식별
   * - users 컬렉션을 추가 조회하지 않고도 이름 표시 가능
   * - 신청 시점의 사용자 이름을 보존
   * 
   * @type {string}
   * @required
   */
  userName: string;

  /**
   * 사업자등록번호 (10자리)
   * 
   * - 국세청에서 발급하는 사업자의 고유 번호
   * - 형식: "123-45-67890" (하이픈 포함) 또는 "1234567890" (숫자만)
   * - 10자리 숫자로 구성 (3자리-2자리-5자리)
   * - 사업자등록증에 기재된 번호와 일치해야 함
   * - 관리자가 실제 사업자등록증의 번호와 대조하여 확인
   * - 중복 신청 방지를 위해 동일 번호 검증 필요
   * 
   * @type {string}
   * @required
   * 
   * @example
   * "123-45-67890"
   * "1234567890"
   */
  businessNumber: string;

  /**
   * 상호명 (회사명)
   * 
   * - 사업자등록증에 기재된 상호 또는 회사 이름
   * - 예: "바나나컴퓨터", "(주)중고나라", "홍길동컴퓨터"
   * - 사업자등록증의 상호명과 정확히 일치해야 함
   * - 관리자가 사업자등록증 이미지와 대조하여 확인
   * - 승인 후 User.name으로 사용될 수 있음
   * 
   * @type {string}
   * @required
   */
  companyName: string;

  /**
   * 대표자명
   * 
   * - 사업자의 법적 대표자 이름
   * - 사업자등록증에 기재된 대표자 성명과 일치해야 함
   * - 개인사업자의 경우 사업자 본인의 이름
   * - 법인사업자의 경우 대표이사의 이름
   * - 관리자가 사업자등록증과 대조하여 확인
   * 
   * @type {string}
   * @required
   */
  representativeName: string;

  /**
   * 사업자등록증 이미지 URL
   * 
   * - Firebase Storage에 업로드된 사업자등록증 사진의 다운로드 URL
   * - 신청 시 사용자가 사업자등록증을 촬영하거나 스캔하여 업로드
   * - 관리자가 이 이미지를 확인하여 진위 여부 판단
   * - 사업자등록번호, 상호명, 대표자명이 선명하게 보여야 함
   * - 이미지 형식: JPG, PNG 등
   * - 개인정보 보호를 위해 접근 권한 제어 필요
   * 
   * @type {string}
   * @required
   * 
   * @example
   * "https://firebasestorage.googleapis.com/.../business-verifications/user123_license.jpg"
   */
  documentUrl: string;

  /**
   * 사업자 인증 처리 상태
   * 
   * - BusinessVerificationStatus enum 값 중 하나
   * - 신청 직후: BusinessVerificationStatus.PENDING
   * - 관리자 승인 시: BusinessVerificationStatus.APPROVED
   * - 관리자 거부 시: BusinessVerificationStatus.REJECTED
   * - 관리자 대시보드에서 PENDING 상태인 신청만 필터링하여 표시
   * - 상태에 따라 UI와 가능한 액션이 달라짐
   * 
   * @type {BusinessVerificationStatus}
   * @required
   * @see BusinessVerificationStatus
   */
  status: BusinessVerificationStatus;

  /**
   * 거부 사유 (선택 사항)
   * 
   * - 관리자가 신청을 거부할 때 입력하는 사유
   * - REJECTED 상태일 때만 값이 있음
   * - PENDING이나 APPROVED 상태에서는 null
   * - 신청자가 이 사유를 확인하고 문제를 해결하여 재신청 가능
   * - 명확하고 구체적인 사유 작성이 중요
   * - 예: "사업자등록증이 흐려서 확인이 어렵습니다", "상호명이 일치하지 않습니다"
   * 
   * @type {string | null | undefined}
   * @optional
   * 
   * @example
   * // 승인 또는 대기 중
   * rejectionReason: null
   * 
   * // 거부된 경우
   * rejectionReason: "제출하신 사업자등록증의 이미지가 흐려 정보 확인이 어렵습니다. 선명한 이미지로 재신청 부탁드립니다."
   */
  rejectionReason?: string | null;

  /**
   * 신청 일시
   * 
   * - 사용자가 사업자 인증을 신청한 시각
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - 신청 순서대로 정렬하여 관리자에게 표시
   * - 오래된 신청을 우선 처리하도록 유도
   * - 변경되지 않는 값
   * 
   * @type {Date}
   * @required
   */
  createdAt: Date;

  /**
   * 승인/거부 처리 일시 (선택 사항)
   * 
   * - 관리자가 신청을 승인하거나 거부한 시각
   * - PENDING 상태일 때는 null
   * - APPROVED 또는 REJECTED 상태로 변경될 때 현재 시각으로 설정
   * - Firestore Timestamp로 저장되며, 클라이언트에서 Date 객체로 변환
   * - createdAt과 processedAt의 차이로 처리 소요 시간 계산 가능
   * - 빠른 처리가 사용자 만족도에 긍정적 영향
   * 
   * @type {Date | null | undefined}
   * @optional
   * 
   * @example
   * // 아직 처리되지 않음
   * processedAt: null
   * 
   * // 처리 완료
   * processedAt: new Date("2024-01-11T14:20:00")
   */
  processedAt?: Date | null;

  /**
   * 처리한 관리자의 사용자 ID (선택 사항)
   * 
   * - 신청을 승인하거나 거부한 관리자의 User.uid
   * - UserType.ADMIN인 사용자만 처리 가능
   * - PENDING 상태일 때는 null
   * - APPROVED 또는 REJECTED 상태로 변경될 때 설정됨
   * - 어느 관리자가 어떤 결정을 내렸는지 추적
   * - 관리자 활동 로그 및 책임 소재 확인에 사용
   * - 문제 발생 시 해당 관리자에게 문의 가능
   * 
   * @type {string | null | undefined}
   * @optional
   * 
   * @example
   * // 아직 처리되지 않음
   * processedBy: null
   * 
   * // 관리자가 처리함
   * processedBy: "admin_user_001"
   */
  processedBy?: string | null;
}
