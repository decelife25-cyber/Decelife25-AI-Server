import { Logger } from '../types/logger';

export class NoopLogger implements Logger {
  trace(_message: string, _meta?: Record<string, unknown>): void {}
  debug(_message: string, _meta?: Record<string, unknown>): void {}
  info(_message: string, _meta?: Record<string, unknown>): void {}
  warn(_message: string, _meta?: Record<string, unknown>): void {}
  error(_message: string, _meta?: Record<string, unknown>): void {}
  child?(context: Record<string, unknown>): Logger {
    return this;
  }
}
