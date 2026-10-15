export interface LogPayload {
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const SERVICE_NAME = process.env.SERVICE_NAME || 'user-service';

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    const log: LogPayload = {
      level: 'info',
      service: SERVICE_NAME,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };
    console.log(JSON.stringify(log));
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    const log: LogPayload = {
      level: 'warn',
      service: SERVICE_NAME,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };
    console.warn(JSON.stringify(log));
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const log: LogPayload = {
      level: 'error',
      service: SERVICE_NAME,
      message,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      ...context,
    };
    console.error(JSON.stringify(log));
  },
};
