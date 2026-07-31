export interface ConfigProvider {
  /**
   * Obtiene una clave de configuración de forma tipada.
   * Devuelve undefined si no existe.
   */
  get<T = unknown>(key: string): T | undefined;

  has(key: string): boolean;
}
