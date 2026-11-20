import { FindOptionsOrder, ObjectLiteral, Repository } from "typeorm";

export function firstSeeded<Entity extends ObjectLiteral & { id: number }>(
  repository: Repository<Entity>,
): Promise<Entity> {
  return repository.findOneOrFail({
    // eslint-disable-next-line no-restricted-syntax
    where: {},
    order: { id: "ASC" } as FindOptionsOrder<Entity>,
  });
}
