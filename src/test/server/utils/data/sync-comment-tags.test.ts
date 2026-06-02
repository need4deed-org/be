import { In } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommentPerson from "../../../../data/entity/m2m/comment-person";
import { syncCommentTags } from "../../../../server/utils/data/sync-comment-tags";

const find = vi.fn();
const save = vi.fn();
const del = vi.fn();

const fakeManager: any = {
  getRepository: (entity: any) => {
    if (entity !== CommentPerson) {
      throw new Error(`unexpected repo: ${entity?.name}`);
    }
    return { find, save, delete: del };
  },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("syncCommentTags", () => {
  it("inserts new rows and deletes removed rows; leaves unchanged rows alone", async () => {
    find.mockResolvedValueOnce([
      { id: 100, commentId: 7, personId: 5 },
      { id: 101, commentId: 7, personId: 9 },
    ]);

    await syncCommentTags(7, [5, 12], fakeManager);

    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith({ id: In([101]) });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toEqual([
      expect.objectContaining({ commentId: 7, personId: 12 }),
    ]);
  });

  it("is a no-op when desired and existing sets match", async () => {
    find.mockResolvedValueOnce([
      { id: 100, commentId: 7, personId: 5 },
      { id: 101, commentId: 7, personId: 9 },
    ]);

    await syncCommentTags(7, [9, 5], fakeManager);

    expect(del).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("deletes all rows when desiredPersonIds is empty", async () => {
    find.mockResolvedValueOnce([
      { id: 100, commentId: 7, personId: 5 },
      { id: 101, commentId: 7, personId: 9 },
    ]);

    await syncCommentTags(7, [], fakeManager);

    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith({ id: In([100, 101]) });
    expect(save).not.toHaveBeenCalled();
  });

  it("treats undefined desiredPersonIds the same as an empty list (deletes all)", async () => {
    find.mockResolvedValueOnce([{ id: 100, commentId: 7, personId: 5 }]);

    await syncCommentTags(7, undefined, fakeManager);

    expect(del).toHaveBeenCalledWith({ id: In([100]) });
    expect(save).not.toHaveBeenCalled();
  });

  it("dedupes desiredPersonIds before computing the diff", async () => {
    find.mockResolvedValueOnce([]);

    await syncCommentTags(7, [5, 5, 12, 12], fakeManager);

    expect(save).toHaveBeenCalledTimes(1);
    const inserted = save.mock.calls[0][0] as CommentPerson[];
    expect(inserted).toHaveLength(2);
    expect(new Set(inserted.map((cp) => cp.personId))).toEqual(
      new Set([5, 12]),
    );
  });

  it("inserts everything when no rows exist yet", async () => {
    find.mockResolvedValueOnce([]);

    await syncCommentTags(42, [1, 2, 3], fakeManager);

    expect(del).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
    const rows = save.mock.calls[0][0] as CommentPerson[];
    expect(
      rows.map((r) => ({ commentId: r.commentId, personId: r.personId })),
    ).toEqual([
      { commentId: 42, personId: 1 },
      { commentId: 42, personId: 2 },
      { commentId: 42, personId: 3 },
    ]);
  });
});
