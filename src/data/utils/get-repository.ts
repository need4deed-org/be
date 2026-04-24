import { DataSource, EntityManager, ObjectLiteral, Repository } from "typeorm";

export function getRepository<T extends ObjectLiteral>(
  dataSource: DataSource | EntityManager,
  entity: (new () => T) | string,
): Repository<T> {
  const repository = dataSource.getRepository(entity);
  if (!repository) {
    throw new Error(
      `${typeof entity === "string" ? entity : entity.name} entity is not initialized.`,
    );
  }
  return repository;
}
