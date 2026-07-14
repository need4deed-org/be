import { describe, expect, it } from "vitest";
import { commentSerializer } from "../../../services/dto/dto-comment";

describe("commentSerializer", () => {
  it("maps all comment fields correctly", () => {
    const comment = {
      id: 7,
      text: "Great volunteer!",
      entityId: 42,
      entityType: "volunteer",
      updatedAt: new Date("2025-03-10"),
      user: { person: { name: "Coordinator Jane" } },
    };

    const result = commentSerializer(comment as any);

    expect(result).toEqual({
      id: 7,
      content: "Great volunteer!",
      entityId: 42,
      entityType: "volunteer",
      authorName: "Coordinator Jane",
      timestamp: comment.updatedAt,
      taggedPersons: [],
    });
  });

  it("maps commentPerson rows to taggedPersons with readAt", () => {
    const readAt = new Date("2025-04-01");
    const comment = {
      id: 10,
      text: "Hey <@5> and <@9>",
      entityId: 1,
      entityType: "opportunity",
      updatedAt: new Date(),
      user: { person: { name: "Author" } },
      commentPerson: [
        { personId: 5, readAt },
        { personId: 9, readAt: null },
      ],
    };

    const result = commentSerializer(comment as any);
    expect(result.taggedPersons).toEqual([
      { id: 5, readAt },
      { id: 9, readAt: null },
    ]);
  });

  it("returns an empty taggedPersons when commentPerson is missing", () => {
    const comment = {
      id: 11,
      text: "no tags",
      entityId: 1,
      entityType: "opportunity",
      updatedAt: new Date(),
      user: { person: { name: "Author" } },
    };

    const result = commentSerializer(comment as any);
    expect(result.taggedPersons).toEqual([]);
  });

  it("returns undefined authorName when user has no person", () => {
    const comment = {
      id: 8,
      text: "Note",
      entityId: 1,
      entityType: "opportunity",
      updatedAt: new Date(),
      user: {},
    };

    const result = commentSerializer(comment as any);
    expect(result.authorName).toBeUndefined();
  });

  it("returns undefined authorName when user is missing", () => {
    const comment = {
      id: 9,
      text: "Note",
      entityId: 1,
      entityType: "opportunity",
      updatedAt: new Date(),
    };

    const result = commentSerializer(comment as any);
    expect(result.authorName).toBeUndefined();
  });
});
