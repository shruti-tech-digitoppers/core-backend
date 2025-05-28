export const API_MESSAGES = {
	200: 'Success',
	201: 'Created',
	400: 'Bad Request',
	401: 'Permission Denied',
	404: 'Not Found',
	406: 'Not Acceptable',
	422: 'Invalid',
	500: 'Internal Server Error',
	502: 'Bad Gateway',
  };
  
  export const ERROR_CODES = {
	BAD_REQUEST: 'code/bad-request',
	OTP_EXPIRED: 'auth/otp-expired',
	AUTH_TOKEN_EXPIRED: 'auth/token-expired',
	USER_DISABLED: 'auth/user-disabled',
	UNVERIFIED: 'auth/not-verified',
	UNAUTHORIZED: 'auth/unauthorized',
	FORBIDDEN: 'auth/forbidden',
	AUTH_USER_NOT_FOUND: 'auth/user-not-found',
	MISSING_PARAMS: 'code/missing-params',
	NOT_ACCEPTABLE: 'code/not-acceptable',
	SERVER_ERROR: 'code/internal-server-error',
	DATA_NOT_FOUND: 'db/data-not-found',
	INVALID: 'code/invalid',
	ALREADY_USED: 'code/already-used',
	WORNG: 'code/wrong-coupon-code',
	UNPROCESSABLE: 'auth/unprocessable',
	AUTH_TOKEN_UNAVAILABLE: 'code/token-unavailable',
	PG_ERROR: 'pg/payment-gateway-error',
	PG_INVALID_PAYMENT: 'pg/invalid-payment-info',
	INVALID_ARGUMENT: 'code/invalid-argument',
	UNKNOWN_ERROR: 'code/unknown-error',
	ACCOUNT_ALREADY_EXISTS: 'auth/account_already_exists',	
  };

//  export const VALIDATION_ERROR = 'code/validation-error';
  