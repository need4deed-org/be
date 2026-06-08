import { EntityTableName } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Comment from "../../../../data/entity/comment.entity";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import User from "../../../../data/entity/user.entity";
import { writeOpportunityContactComment } from "../../../../server/utils/data/write-opportunity-contact-comment";

const userFindOne = vi.fn();
const agentPersonFindOne = vi.fn();
const commentCreate = vi.fn((c: any) => c);
const commentSave = vi.fn();

const fakeManager: any = {
  getRepository: (entity: any) => {
    switch (entity) {
      case User:
        return { findOne: userFindOne };
      case AgentPerson:
        return { findOne: agentPersonFindOne };
      case Comment:
        return { create: commentCreate, save: commentSave };
      default:
        throw new Error(`unexpected repo: ${entity?.name}`);
    }
  },
};

const body = {
  rac_email: "sam@center.de",
  rac_full_name: "Sam Submitter",
  rac_phone: "+49-30-2222222",
  rac_address: "Musterstr. 1",
  rac_plz: "12345",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("writeOpportunityContactComment", () => {
  it("writes a piped comment authored by the agent's linked user", async () => {
    agentPersonFindOne.mockResolvedValueOnce({
      id: 5,
      agentId: 42,
      personId: 9,
    });
    userFindOne.mockResolvedValueOnce({ id: 7, personId: 9 }); // by personId

    await writeOpportunityContactComment(876, 42, body, fakeManager);

    expect(commentSave).toHaveBeenCalledTimes(1);
    expect(commentCreate.mock.calls[0][0]).toEqual({
      text: "sam@center.de<|>Sam Submitter<|>Musterstr. 1<|>12345<|>+49-30-2222222",
      entityType: EntityTableName.OPPORTUNITY,
      entityId: 876,
      userId: 7,
    });
  });

  it("falls back to the first user when the agent has no linked user", async () => {
    agentPersonFindOne.mockResolvedValueOnce(null);
    userFindOne.mockResolvedValueOnce({ id: 1 }); // fallback first user

    await writeOpportunityContactComment(876, 42, body, fakeManager);

    expect(userFindOne).toHaveBeenLastCalledWith({
      where: {},
      order: { id: "ASC" },
    });
    expect(commentCreate.mock.calls[0][0]).toMatchObject({
      userId: 1,
      entityId: 876,
    });
  });

  it("no-ops when no contact fields are present (no author lookup, no write)", async () => {
    await writeOpportunityContactComment(
      876,
      42,
      { ...body, rac_email: "", rac_full_name: "", rac_phone: "" },
      fakeManager,
    );

    expect(agentPersonFindOne).not.toHaveBeenCalled();
    expect(userFindOne).not.toHaveBeenCalled();
    expect(commentSave).not.toHaveBeenCalled();
  });

  it("no-ops when no user exists to author the comment", async () => {
    agentPersonFindOne.mockResolvedValueOnce(null);
    userFindOne.mockResolvedValueOnce(null);

    await writeOpportunityContactComment(876, 42, body, fakeManager);

    expect(commentSave).not.toHaveBeenCalled();
  });

  it("never throws — a save failure is swallowed", async () => {
    agentPersonFindOne.mockResolvedValueOnce(null);
    userFindOne.mockResolvedValueOnce({ id: 1 });
    commentSave.mockRejectedValueOnce(new Error("db down"));

    await expect(
      writeOpportunityContactComment(876, 42, body, fakeManager),
    ).resolves.toBeUndefined();
  });
});
