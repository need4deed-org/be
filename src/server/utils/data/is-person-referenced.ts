import { EntityManager, EntityMetadata } from "typeorm";
import Person from "../../../data/entity/person.entity";

// Does any row anywhere point at this Person — a User, Volunteer, agent
// membership, opportunity contact, post/comment tag, testimonial, ...?
// Walks the TypeORM metadata rather than a hand-kept list, so a relation
// added later is covered too. Several of those FKs are ON DELETE CASCADE
// (agent_person, post, comment_person, ...), so a failed delete can't be
// relied on to say "still in use" — deleting would silently take that data
// with it. Person's own outgoing relations (e.g. its Address) don't count.
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
