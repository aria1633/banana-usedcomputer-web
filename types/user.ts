// types/user.ts
// 사용자 관련 타입 정의 파일
// 이 파일은 애플리케이션의 사용자 모델을 정의하며, 권한 및 인증 상태를 관리합니다.

/**
 * 사용자 타입 열거형
 * 
 * 시스템 내 사용자의 역할을 정의하는 Enum입니다.
 * 각 역할은 서로 다른 권한과 기능에 접근할 수 있습니다.
 * 
 * @enum {string}
 * 
 * - NORMAL: 일반 사용자 (기본 권한)
 *   * 상품 목록 조회 및 상세 정보 열람
 *   * 상품에 대한 문의 작성
 *   * 중고 컴퓨터 매입 요청 등록 (역경매)
 *   * 도매상이 제시한 매입가 확인 및 선택
 * 
 * - WHOLESALER: 도매상 (판매자 권한)
 *   * 일반 사용자의 모든 기능
 *   * 중고 컴퓨터 상품 등록 및 판매
 *   * 재고 관리 및 가격 조정
 *   * 일반 사용자의 매입 요청에 매입가 제시
 *   * 받은 문의에 대한 답변 작성
 *   * 사업자 인증이 승인된 경우에만 활동 가능
 * 
 * - ADMIN: 시스템 관리자 (최고 권한)
 *   * 모든 사용자의 정보 조회 및 관리
 *   * 사업자 인증 신청 승인/거부 처리
 *   * 전체 거래 내역 및 통계 확인
 *   * 부적절한 콘텐츠 관리 및 사용자 제재
 */
export enum UserType {
  NORMAL = 'normal',       // 일반 사용자
  WHOLESALER = 'wholesaler', // 도매상 (판매자)
  ADMIN = 'admin',         // 시스템 관리자
}

/**
 * 사업자 인증 상태 열거형
 * 
 * 도매상으로 활동하기 위한 사업자 인증 프로세스의 현재 상태를 나타냅니다.
 * 일반 사용자가 도매상이 되기 위해서는 사업자등록증을 제출하고 
 * 관리자의 승인을 받아야 합니다.
 * 
 * @enum {string}
 * 
 * - NONE: 인증 신청을 하지 않은 기본 상태
 *   * 회원 가입 시 기본값
 *   * 일반 사용자로만 활동 가능
 * 
 * - PENDING: 인증 심사가 진행 중인 상태
 *   * 사업자등록증을 제출한 후
 *   * 관리자의 검토를 기다리는 중
 *   * 이 상태에서는 아직 도매상 기능을 사용할 수 없음
 * 
 * - APPROVED: 인증이 승인된 상태
 *   * 관리자가 사업자등록증을 검토하고 승인함
 *   * userType이 WHOLESALER로 변경됨
 *   * 상품 등록 및 판매 기능 사용 가능
 * 
 * - REJECTED: 인증이 거부된 상태
 *   * 사업자등록증이 유효하지 않거나 정보가 일치하지 않음
 *   * 거부 사유를 확인하고 재신청 가능
 *   * 일반 사용자 권한으로 유지됨
 */
export enum VerificationStatus {
  NONE = 'none',           // 미신청 (기본값)
  PENDING = 'pending',     // 심사 대기 중
  APPROVED = 'approved',   // 승인 완료
  REJECTED = 'rejected',   // 승인 거부
}

/**
 * 사용자 정보 인터페이스
 * 
 * Firestore의 'users' 컬렉션에 저장되는 사용자 문서의 구조를 정의합니다.
 * Firebase Authentication과 연동되어 사용자의 인증 정보와 프로필을 관리합니다.
 * 
 * @interface User
 * 
 * @example
 * // 일반 사용자 예시
 * const normalUser: User = {
 *   uid: "abc123xyz",
 *   email: "user@example.com",
 *   name: "홍길동",
 *   phoneNumber: "010-1234-5678",
 *   userType: UserType.NORMAL,
 *   verificationStatus: VerificationStatus.NONE,
 *   createdAt: new Date(),
 *   updatedAt: null
 * };
 * 
 * @example
 * // 도매상 (사업자 인증 완료) 예시
 * const wholesaler: User = {
 *   uid: "def456uvw",
 *   email: "wholesaler@example.com",
 *   name: "바나나컴퓨터",
 *   phoneNumber: "02-1234-5678",
 *   userType: UserType.WHOLESALER,
 *   verificationStatus: VerificationStatus.APPROVED,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * };
 */
export interface User {
  /**
   * Firebase Authentication에서 생성된 사용자 고유 식별자
   * 
   * - Firebase Auth의 User.uid와 동일한 값
   * - Firestore 문서의 ID로도 사용됨 (users/{uid})
   * - 변경 불가능한 값으로, 사용자 식별에 사용
   * - 다른 컬렉션에서 외래 키처럼 참조됨
   * 
   * @type {string}
   * @required
   */
  uid: string;

  /**
   * 사용자의 이메일 주소
   * 
   * - Firebase Auth의 로그인 수단
   * - 고유값이어야 하며 중복 불가
   * - 비밀번호 재설정 시 사용
   * - 중요 알림 발송 용도
   * 
   * @type {string}
   * @required
   */
  email: string;

  /**
   * 사용자 이름 또는 닉네임
   * 
   * - 회원 가입 시 입력받는 표시 이름
   * - 도매상의 경우 상호명이나 사업자명
   * - 문의, 매입 요청 등에서 사용자를 식별하는 용도
   * - UI에서 "작성자", "판매자" 등으로 표시
   * 
   * @type {string}
   * @required
   */
  name: string;

  /**
   * 사용자의 연락처 전화번호 (선택 사항)
   *
   * - 거래 시 연락을 위한 전화번호
   * - 형식: "010-1234-5678" (하이픈 포함 권장)
   * - 입력하지 않은 경우 null
   * - 도매상의 경우 고객 문의 응대용으로 권장
   *
   * @type {string | null | undefined}
   * @optional
   */
  phoneNumber?: string | null;

  /**
   * 사업자 등록증 파일 URL (도매상만 해당)
   *
   * - 도매상 회원가입 시 필수 제출
   * - Supabase Storage에 업로드된 파일의 공개 URL
   * - 관리자가 사업자 인증 심사 시 확인
   * - 일반 사용자는 null
   *
   * @type {string | null | undefined}
   * @optional
   */
  businessRegistrationUrl?: string | null;

  /**
   * 사용자의 역할 타입
   * 
   * - 시스템 내에서 사용자의 권한 수준을 결정
   * - UserType enum 값 중 하나
   * - 회원 가입 시 기본값: UserType.NORMAL
   * - 사업자 인증 승인 시 UserType.WHOLESALER로 변경
   * - 관리자는 수동으로 UserType.ADMIN 할당
   * 
   * @type {UserType}
   * @required
   * @see UserType
   */
  userType: UserType;

  /**
   * 사업자 인증 진행 상태
   *
   * - 도매상 권한 획득을 위한 인증 프로세스의 현재 단계
   * - VerificationStatus enum 값 중 하나
   * - 회원 가입 시 기본값: VerificationStatus.NONE
   * - 사업자등록증 제출 시 PENDING으로 변경
   * - 관리자 승인 시 APPROVED, 거부 시 REJECTED
   * - APPROVED 상태일 때만 userType이 WHOLESALER로 변경 가능
   *
   * @type {VerificationStatus}
   * @required
   * @see VerificationStatus
   */
  verificationStatus: VerificationStatus;

  /**
   * 도매상 승인 거부 사유 (선택 사항)
   *
   * - 관리자가 도매상 신청을 거부할 때 입력하는 사유
   * - verificationStatus가 REJECTED일 때만 값이 있음
   * - 사용자가 이 사유를 확인하고 문제를 해결하여 재신청 가능
   * - 승인 시(APPROVED) 또는 재신청 시 null로 초기화
   * - 예: "사업자등록증의 상호명이 일치하지 않습니다"
   *
   * @type {string | null | undefined}
   * @optional
   */
  rejectionReason?: string | null;

  /**
   * 계정 생성 일시
   * 
   * - 사용자가 회원 가입을 완료한 시각
   * - Firebase Auth 계정 생성과 동시에 기록
   * - Timestamp 타입으로 Firestore에 저장되며, 클라이언트에서 Date로 변환
   * - 통계 및 사용자 관리에 활용
   * - 변경되지 않는 값
   * 
   * @type {Date}
   * @required
   */
  createdAt: Date;

  /**
   * 마지막 정보 수정 일시 (선택 사항)
   * 
   * - 사용자 프로필이 마지막으로 업데이트된 시각
   * - 이름, 전화번호, 사업자 인증 상태 등 변경 시 갱신
   * - 생성 시점에는 null
   * - Timestamp 타입으로 Firestore에 저장되며, 클라이언트에서 Date로 변환
   * - 프로필 변경 이력 추적에 사용
   * 
   * @type {Date | null | undefined}
   * @optional
   */
  updatedAt?: Date | null;
}
