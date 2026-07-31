type Factory<T> = () => T | Promise<T>;

export class ServiceContainer {
  private singletons = new Map<string | symbol, any>();
  private factories = new Map<string | symbol, Factory<any>>();

  /** Registra una instancia singleton */
  registerSingleton<T>(key: string | symbol, instance: T): void {
    this.singletons.set(key, instance);
  }

  /** Registra una factory para crear instancias bajo demanda */
  registerFactory<T>(key: string | symbol, factory: Factory<T>): void {
    this.factories.set(key, factory);
  }

  /** Resuelve una instancia. Si existe un singleton, se devuelve; si existe una factory, se ejecuta y se cachea como singleton. */
  async resolve<T>(key: string | symbol): Promise<T> {
    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T;
    }

    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`Service not registered: ${String(key)}`);
    }

    const created = await factory();
    this.singletons.set(key, created);
    return created as T;
  }

  has(key: string | symbol): boolean {
    return this.singletons.has(key) || this.factories.has(key);
  }

  clear(): void {
    this.singletons.clear();
    this.factories.clear();
  }
}
