import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'worker' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        winston.format.printf(({ timestamp, level, message, service, job, ...rest }: any) => {
          const jobTag = job ? ` [${job}]` : '';
          const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp} ${level} [${service}]${jobTag} ${message}${extra}`;
        }),
      ),
    }),
  ],
});

export default logger;
