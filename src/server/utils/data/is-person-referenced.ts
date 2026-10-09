import { EntityManager, EntityMetadata } from "typeorm";
import Person from "../../../data/entity/person.entity";

// several FKs to Person are ON DELETE CASCADE, so a failed delete can't signal "in use"
export async function isPersonReferenced(
  manager: EntityManager,
  personId: number,
): Promise<boolean> {
  for (const metadata of manager.connection.entityMetadatas) {
    for (const relation of metadata.relations) {
      if (relation.inverseEntityMetadata.target !== Person) {
        continue;
      }

      let target: EntityMetadata;
      let column: string;
      if (relation.isManyToMany && relation.isOwning) {
        target = relation.junctionEntityMetadata!;
        column = relation.inverseJoinColumns[0].databaseName;
      } else if (relation.isManyToOne || relation.isOneToOneOwner) {
        target = metadata;
        column = relation.joinColumns[0].databaseName;
      } else {
        continue;
      }

      const count = await manager
        .createQueryBuilder()
        .from(target.target, "t")
        .where(`t."${column}" = :personId`, { personId })
        .getCount();
      if (count > 0) {
        return true;
      }
    }
  }
  return false;
}
