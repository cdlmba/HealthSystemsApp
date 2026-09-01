/**
 * A simple structured logger for client-side applications.
 * Can be extended later to forward logs to external services (like Sentry or Datadog).
 */

type LogLevel = 'info' | 'warn' | 'error';

class Logger {
  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };

    // In a real production app, we could check environment variables to decide
    // whether to console.log or send to a remote ingestion endpoint.
    switch (level) {
      case 'info':
        console.info(`[${timestamp}] INFO: ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`[${timestamp}] WARN: ${message}`, data || '');
        break;
      case 'error':
        console.error(`[${timestamp}] ERROR: ${message}`, data || '');
        break;
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any) {
    this.log('error', message, error);
  }
}

export const logger = new Logger();
