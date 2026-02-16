import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const winstonConfig: winston.LoggerOptions = {
    level: isProduction ? 'info' : 'debug',
    format: isProduction
        ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
          )
        : winston.format.combine(
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
