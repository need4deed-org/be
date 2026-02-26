import { EntityTableName } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/volunteer/comment.entity";
import { getRepository } from "../../../data/utils";
import { pascal2snake } from "../../../services/utils";

export async function addComments2Entity<E extends { id: number }>(
  instance: E,
): Promise<E & { comments: Comment[] }> {
  const instanceMetadata = dataSource.getMetadata(instance.constructor);
  const commentRepository = getRepository(dataSource, Comment);

  const where = {
    entityId: instance.id,
    entityType: pascal2snake(instanceMetadata.name, "lower") as EntityTableName,
  };
  const relations = ["user.person"];

  const comments = await commentRepository.find({
    where,
    relations,
  });

  return Object.assign(instance, { comments });
}
