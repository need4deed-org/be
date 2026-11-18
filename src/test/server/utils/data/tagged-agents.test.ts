import { describe, expect, it } from "vitest";
import { getTaggedAgentIds } from "../../../../server/utils/data/tagged-agents";

describe("getTaggedAgentIds", () => {
  it("returns each tagged agent id once, ignoring person tokens", () => {
    expect(
      getTaggedAgentIds(
        "Hi <@agent:4> and <@person:9>, also <@agent:4> <@agent:12>",
      ),
    ).toEqual([4, 12]);
  });

  it("ignores ids beyond the integer column range", () => {
    expect(getTaggedAgentIds("<@agent:99999999999> <@agent:7>")).toEqual([7]);
  });

  it("returns nothing for text without agent tokens", () => {
    expect(getTaggedAgentIds("No tags <@3>")).toEqual([]);
  });
});
