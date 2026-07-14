import { describe, expect, it } from "vitest";
import { getStartEnd } from "../../../data/utils";

describe("getStartEnd", () => {
  it("maps known morning/noon/afternoon/evening labels to hour ranges", () => {
    const morning = getStartEnd("morning");
    expect(morning!.start.getHours()).toBe(8);
    expect(morning!.end.getHours()).toBe(11);

    const noon = getStartEnd("noon");
    expect(noon!.start.getHours()).toBe(11);
    expect(noon!.end.getHours()).toBe(14);

    const afternoon = getStartEnd("afternoon");
    expect(afternoon!.start.getHours()).toBe(14);
    expect(afternoon!.end.getHours()).toBe(17);

    const evening = getStartEnd("evening");
    expect(evening!.start.getHours()).toBe(17);
    expect(evening!.end.getHours()).toBe(20);
  });

  it("maps time-range string formats", () => {
    const r1 = getStartEnd("08-11");
    expect(r1!.start.getHours()).toBe(8);
    expect(r1!.end.getHours()).toBe(11);

    // "8:00 - 10:00" is mapped to startHour:8, endHour:11 in the source map
    const r2 = getStartEnd("8:00 - 10:00");
    expect(r2!.start.getHours()).toBe(8);
    expect(r2!.end.getHours()).toBe(11);
  });

  it("returns null for unrecognized or unavailability strings", () => {
    expect(getStartEnd("not")).toBeNull();
    expect(getStartEnd("available")).toBeNull();
    expect(getStartEnd("verfügbar")).toBeNull();
    expect(getStartEnd("unknown")).toBeNull();
  });
});
