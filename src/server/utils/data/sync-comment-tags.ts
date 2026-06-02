import { DataSource, EntityManager, In } from "typeorm";
import { dataSource } from "../../../data/data-source";
import CommentPerson from "../../../data/entity/m2m/comment-person";
import { getRepository } from "../../../data/utils";

/**
 * Sync a comment's `comment_person` rows to match `desiredPersonIds`:
 * remove rows whose `personId` is no longer wanted, insert rows for the
 * newly added ids, leave unchanged rows alone. Idempotent.
 *
 * `manager` defaults to the global dataSource; pass a transactional
 * EntityManager so the diff is atomic with surrounding writes
 * (commentRepository.save, etc.).
 */
export async function syncCommentTags(
  commentId: number,
  desiredPersonIds: number[] | undefined,
  manager: DataSource | EntityManager = dataSource,
): Promise<void> {
  const commentPersonRepository = getRepository(manager, CommentPerson);

  const desired = [...new Set((desiredPersonIds ?? []).map(Number))];

  const current = await commentPersonRepository.find({ where: { commentId } });
  const currentPersonIds = current.map(({ personId }) => personId);

  const toRemove = current.filter(
    ({ personId }) => !desired.includes(personId),
  );
  const toAddPersonIds = desired.filter((id) => !currentPersonIds.includes(id));

  if (toRemove.length) {
    await commentPersonRepository.delete({
      id: In(toRemove.map(({ id }) => id)),
    });
  }
  if (toAddPersonIds.length) {
    await commentPersonRepository.save(
      toAddPersonIds.map(
        (personId) => new CommentPerson({ commentId, personId }),
      ),
    );
  }
}
