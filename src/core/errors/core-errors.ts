import { CoreError } from '../types/errors';

export class NotFoundError extends CoreError {
  constructor(resource: string, details?: unknown) {
    super(`${resource} not found`, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends CoreError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
