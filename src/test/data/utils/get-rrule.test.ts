import { describe, expect, it } from "vitest";
import { getRRULE } from "../../../data/utils";

describe("getRRULE", () => {
  it("returns RRULE string for each valid weekday (case-insensitive)", () => {
    expect(getRRULE("monday")).toBe("FREQ=WEEKLY;BYDAY=MO;");
    expect(getRRULE("Tuesday")).toBe("FREQ=WEEKLY;BYDAY=TU;");
    expect(getRRULE("WEDNESDAY")).toBe("FREQ=WEEKLY;BYDAY=WE;");
    expect(getRRULE("thursday")).toBe("FREQ=WEEKLY;BYDAY=TH;");
    expect(getRRULE("Friday")).toBe("FREQ=WEEKLY;BYDAY=FR;");
    expect(getRRULE("saturday")).toBe("FREQ=WEEKLY;BYDAY=SA;");
    expect(getRRULE("sunday")).toBe("FREQ=WEEKLY;BYDAY=SU;");
  });

  it("returns null for invalid day names", () => {
    expect(getRRULE("weekday")).toBeNull();
    expect(getRRULE("mon")).toBeNull();
    expect(getRRULE("")).toBeNull();
    expect(getRRULE("holiday")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(getRRULE(null as any)).toBeNull();
    expect(getRRULE(undefined as any)).toBeNull();
    expect(getRRULE(1 as any)).toBeNull();
  });

  it("returns null for strings with leading or trailing whitespace", () => {
    expect(getRRULE(" monday")).toBeNull();
    expect(getRRULE("monday ")).toBeNull();
  });
});
