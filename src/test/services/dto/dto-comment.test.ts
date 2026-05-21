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
    });
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
