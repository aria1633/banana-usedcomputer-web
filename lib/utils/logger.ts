/**
 * 로깅 유틸리티
 *
 * 목적:
 * 1. 개발 환경에서 상세한 로그 출력
 * 2. 프로덕션에서 에러 모니터링 (Sentry 등)
 * 3. API 호출 추적
 * 4. localStorage 변경 추적
 * 5. 디버깅 효율성 향상
 */

type LogLevel = 'info' | 'warn' | 'error' | 'api' | 'storage';

interface LogData {
  [key: string]: any;
}

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 로그 메시지 포맷팅
 */
function formatLog(level: LogLevel, message: string, data?: LogData): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data && Object.keys(data).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
  }

  return `${prefix} ${message}`;
}

/**
 * INFO 로그
 *
 * @example
 * logger.info('User logged in', { userId: 'abc123' });
 */
function info(message: string, data?: LogData): void {
  if (isDevelopment) {
    console.log(formatLog('info', message, data));
  }
}

/**
 * WARN 로그
 *
 * @example
 * logger.warn('Session expired', { userId: 'abc123' });
 */
function warn(message: string, data?: LogData): void {
  if (isDevelopment) {
    console.warn(formatLog('warn', message, data));
  }
}

/**
 * ERROR 로그 + 프로덕션에서 모니터링 전송
 *
 * @example
 * logger.error('Failed to create product', { error, productId });
 */
function error(message: string, data?: LogData): void {
  console.error(formatLog('error', message, data));

  // 프로덕션에서는 Sentry 같은 모니터링 도구로 전송
  if (!isDevelopment) {
    // TODO: Sentry.captureException() 또는 다른 모니터링 도구
    // Sentry.captureException(new Error(message), {
    //   extra: data,
    // });
  }
}

/**
 * API 호출 로그
 *
 * @example
 * logger.api('POST', '/rest/v1/products', 201, { duration: '123ms' });
 */
function api(
  method: string,
  url: string,
  status: number,
  data?: LogData
): void {
  if (isDevelopment) {
    const statusColor = status >= 200 && status < 300 ? '✅' : '❌';
    const message = `${statusColor} ${method} ${url} - ${status}`;
    console.log(formatLog('api', message, data));
  }
}

/**
 * localStorage 변경 로그
 *
 * @example
 * logger.storage('SET', 'session-key', 'eyJhbGc...');
 */
function storage(action: 'SET' | 'REMOVE' | 'CLEAR', key?: string, value?: string): void {
  if (isDevelopment) {
    const message = key
      ? `${action} ${key}`
      : action;

    const data = value
      ? { preview: value.substring(0, 100) + '...' }
      : undefined;

    console.log(formatLog('storage', message, data));
  }
}

/**
 * 그룹 로그 시작
 *
 * @example
 * logger.group('User Authentication');
 * logger.info('Step 1: Validate credentials');
 * logger.info('Step 2: Create session');
 * logger.groupEnd();
 */
function group(label: string): void {
  if (isDevelopment) {
    console.group(`🔍 ${label}`);
  }
}

/**
 * 그룹 로그 종료
 */
function groupEnd(): void {
  if (isDevelopment) {
    console.groupEnd();
  }
}

/**
 * 성능 측정 시작
 *
 * @example
 * const timer = logger.startTimer('Create Product');
 * // ... 작업 수행
 * timer.end(); // "Create Product completed in 123ms"
 */
function startTimer(label: string): { end: () => void } {
  const startTime = performance.now();

  return {
    end: () => {
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      info(`${label} completed in ${duration}ms`);
    },
  };
}

/**
 * 테이블 형식 로그 (배열 데이터)
 *
 * @example
 * logger.table([
 *   { id: 1, name: 'Product A', price: 1000 },
 *   { id: 2, name: 'Product B', price: 2000 },
 * ]);
 */
function table(data: any[]): void {
  if (isDevelopment && data.length > 0) {
    console.table(data);
  }
}

export const logger = {
  info,
  warn,
  error,
  api,
  storage,
  group,
  groupEnd,
  startTimer,
  table,
};
