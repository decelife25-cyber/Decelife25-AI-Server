export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  list(filter?: Record<string, unknown>): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}
