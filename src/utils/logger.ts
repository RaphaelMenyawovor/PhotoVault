import winston from 'winston';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'blue',
  http: 'magenta',
  debug: 'green',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports: winston.transport[] = [
  new winston.transports.Console(),
];

// Only write to files in development
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  );
  transports.push(
    new winston.transports.File({ filename: 'logs/all.log' })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});

export default logger;