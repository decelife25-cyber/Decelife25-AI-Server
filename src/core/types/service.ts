export interface IService {
  /** Inicializa el servicio. Debe ser idempotente. */
  init(): Promise<void>;

  /** Cierra / libera recursos del servicio. */
  close(): Promise<void>;
}

export type ServiceConstructor<T> = new (...args: any[]) => T;
