export class CoreError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = 'CORE_ERROR', details?: unknown) {
    super(message);
    this.name = 'CoreError';
    this.code = code;
    this.details = details;
  }
}
