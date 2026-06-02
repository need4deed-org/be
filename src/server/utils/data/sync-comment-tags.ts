import { DataSource, EntityManager, In } from "typeorm";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import CommentPerson from "../../../data/entity/m2m/comment-person";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";

/**
 * Sync a comment's `comment_person` rows to match `desiredPersonIds`:
 * remove rows whose `personId` is no longer wanted, insert rows for the
 * newly added ids, leave unchanged rows alone. Idempotent.
 *
 * `manager` defaults to the global dataSource; pass a transactional
 * EntityManager so the diff is atomic with surrounding writes
 * (commentRepository.save, etc.).
 *
 * NOTE on `undefined`: treated as `[]` here, i.e. clears all existing tags.
 * If a caller wants "leave tags untouched" semantics (e.g. PATCH where the
 * field was omitted), they must guard at the call site and not invoke this
 * helper at all. The comment.ts PATCH handler does exactly that.
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

  if (toAddPersonIds.length) {
    // Pre-validate person ids exist so a bad input becomes a 400 with a
    // clear message instead of a Postgres 23503 buried in the route's
    // generic-error path.
    const personRepository = getRepository(manager, Person);
    const existing = await personRepository.find({
      where: { id: In(toAddPersonIds) },
      select: ["id"],
    });
    const existingIds = new Set(existing.map(({ id }) => id));
    const missing = toAddPersonIds.filter((id) => !existingIds.has(id));
    if (missing.length) {
      throw new BadRequestError(
        `Invalid tagged person id(s): ${missing.join(", ")}`,
      );
    }
  }

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
