import { describe, expect, it } from "vitest";
import { getTaggedAgentIds } from "../../../../server/utils/data/attach-tagged-agents";

describe("getTaggedAgentIds", () => {
  it("returns each tagged agent id once, ignoring person tokens", () => {
    expect(
      getTaggedAgentIds(
        "Hi <@agent:4> and <@person:9>, also <@agent:4> <@agent:12>",
      ),
    ).toEqual([4, 12]);
  });

  it("returns nothing for text without agent tokens", () => {
    expect(getTaggedAgentIds("No tags <@3>")).toEqual([]);
  });
});
