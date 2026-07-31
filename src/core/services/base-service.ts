import { IService } from '../types/service';
import { Logger } from '../types/logger';
import { ConfigProvider } from '../types/config';

export abstract class BaseService implements IService {
  protected readonly logger: Logger;
  protected readonly config: ConfigProvider;

  constructor(options: { logger: Logger; config: ConfigProvider }) {
    this.logger = options.logger;
    this.config = options.config;
  }

  async init(): Promise<void> {
    // implementaciones concretas pueden sobreescribir
    this.logger.debug(`${this.constructor.name} initialized`);
  }

  async close(): Promise<void> {
    this.logger.debug(`${this.constructor.name} closed`);
  }
}
