import { IRepository } from '../types/repository';
import { Logger } from '../types/logger';

export abstract class BaseRepository<T, ID = string> implements IRepository<T, ID> {
  protected readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  abstract findById(id: ID): Promise<T | null>;
  abstract list(filter?: Record<string, unknown>): Promise<T[]>;
  abstract save(entity: T): Promise<T>;
  abstract delete(id: ID): Promise<void>;
}
