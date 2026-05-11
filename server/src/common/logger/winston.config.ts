import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * PII Redaction — strip sensitive fields from log objects before serialization.
 * Walks any nested object/array and replaces values for known-sensitive keys.
 */
const SENSITIVE_KEYS = new Set([
    'password', 'passwd', 'pwd', 'new_password', 'old_password', 'current_password',
    'token', 'access_token', 'refresh_token', 'jwt', 'authorization', 'auth',
    'secret', 'api_key', 'apikey', 'private_key',
    'national_id', 'id_number', 'kra_pin', 'nssf_number', 'nhif_number', 'shif_number',
    'bank_account', 'account_number', 'card_number', 'cvv',
    'basic_salary', 'gross_salary', 'net_salary', 'total_pay',
    'two_factor_secret', 'totp_secret', 'mfa_secret',
]);

const EMAIL_RE = /\b([A-Za-z0-9._%+-]{1,3})[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
const PHONE_RE = /\b(\+?254|0)(7\d{2}|1\d{2})\d{6}\b/g;

function redact(value: any, depth = 0): any {
    if (depth > 6) return '[depth-limit]';
    if (value == null) return value;
    if (typeof value === 'string') {
        return value
            .replace(EMAIL_RE, '$1***@$2')
            .replace(PHONE_RE, '+254****$2****');
    }
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
    if (typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            if (SENSITIVE_KEYS.has(k.toLowerCase())) {
                out[k] = '[REDACTED]';
            } else {
                out[k] = redact(v, depth + 1);
            }
        }
        return out;
    }
    return value;
}

const redactFormat = winston.format((info) => redact(info) as any)();

export const winstonConfig: winston.LoggerOptions = {
    level: isProduction ? 'info' : 'debug',
    format: isProduction
        ? winston.format.combine(
              redactFormat,
              winston.format.timestamp(),
              winston.format.json(),
          )
        : winston.format.combine(
              redactFormat,
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                  const ctx = context ? `[${context}]` : '';
                  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                  return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
              }),
          ),
    transports: [
        new winston.transports.Console(),
        ...(isProduction
            ? [
                  new winston.transports.File({
                      filename: 'logs/error.log',
                      level: 'error',
                      maxsize: 10 * 1024 * 1024, // 10MB
                      maxFiles: 5,
                  }),
                  new winston.transports.File({
                      filename: 'logs/combined.log',
                      maxsize: 10 * 1024 * 1024,
                      maxFiles: 10,
                  }),
              ]
            : []),
    ],
};
