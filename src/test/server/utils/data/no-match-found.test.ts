import { OpportunityType, OpportunityVolunteerStatusType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import OpportunityVolunteer from "../../../../data/entity/m2m/opportunity-volunteer";
import Onetimer from "../../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../../data/entity/opportunity/opportunity.entity";
import {
  isNoMatchFound,
  noMatchFoundCutoff,
} from "../../../../server/utils/data/no-match-found";

const TODAY = new Date(2026, 3, 2);
const CUTOFF = new Date("2026-04-12T22:00:00Z");

const opportunity = (
  date: Date | undefined,
  statuses: OpportunityVolunteerStatusType[] | null = [],
  type: OpportunityType = OpportunityType.ACCOMPANYING,
) =>
  ({
    type,
    onetimer: date ? ({ date } as Onetimer) : undefined,
    opportunityVolunteer: statuses?.map(
      (status) => ({ status }) as OpportunityVolunteer,
    ),
  }) as Opportunity;

describe("noMatchFoundCutoff", () => {
  it("is the start of the working day after the 4th working day, skipping holidays", () => {
    expect(noMatchFoundCutoff(TODAY)).toEqual(CUTOFF);
  });
});

describe("isNoMatchFound", () => {
  it("is true up to the cutoff and false from it", () => {
    const justBefore = new Date(CUTOFF.getTime() - 60_000);
    expect(isNoMatchFound(opportunity(justBefore), TODAY)).toBe(true);
    expect(isNoMatchFound(opportunity(CUTOFF), TODAY)).toBe(false);
  });

  it("is true for an appointment already in the past", () => {
    expect(
      isNoMatchFound(opportunity(new Date("2026-03-30T08:00:00Z")), TODAY),
    ).toBe(true);
  });

  it.each([
    OpportunityVolunteerStatusType.MATCHED,
    OpportunityVolunteerStatusType.ACTIVE,
    OpportunityVolunteerStatusType.PAST,
  ])("is false once a volunteer is %s", (status) => {
    expect(
      isNoMatchFound(
        opportunity(new Date("2026-04-07T08:00:00Z"), [
          OpportunityVolunteerStatusType.PENDING,
          status,
        ]),
        TODAY,
      ),
    ).toBe(false);
  });

  it("stays true with only pending volunteers", () => {
    expect(
      isNoMatchFound(
        opportunity(new Date("2026-04-07T08:00:00Z"), [
          OpportunityVolunteerStatusType.PENDING,
        ]),
        TODAY,
      ),
    ).toBe(true);
  });

  it("is false for other opportunity types", () => {
    expect(
      isNoMatchFound(
        opportunity(
          new Date("2026-04-07T08:00:00Z"),
          [],
          OpportunityType.EVENTS,
        ),
        TODAY,
      ),
    ).toBe(false);
  });

  it("is undefined without an appointment or without loaded volunteers", () => {
    expect(isNoMatchFound(opportunity(undefined), TODAY)).toBeUndefined();
    expect(
      isNoMatchFound(
        opportunity(new Date("2026-04-07T08:00:00Z"), null),
        TODAY,
      ),
    ).toBeUndefined();
  });
});
