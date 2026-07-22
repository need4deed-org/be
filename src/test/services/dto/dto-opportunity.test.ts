import { describe, expect, it } from "vitest";
import {
  dtoOpportunityGet,
  dtoOpportunityGetList,
  getOpportunityContact,
} from "../../../services/dto/dto-opportunity";

const representativePerson = {
  id: 100,
  name: "Coord Carla",
  phone: "+49-30-1111111",
  email: "carla@center.de",
  preferredCommunicationType: ["email"],
};

const agentWithRepresentative = {
  id: 42,
  representative: { person: representativePerson },
};

describe("getOpportunityContact", () => {
  it("returns the submitter when submittedByPerson has an agent_person row for the agent", () => {
    const submitter = {
      id: 7,
      name: "Submitter Sam",
      phone: "+49-30-2222222",
      email: "sam@center.de",
      preferredCommunicationType: ["mobilePhone"],
      agentPerson: [{ agentId: 42 }, { agentId: 999 }],
    };

    const opportunity = {
      agentId: 42,
      agent: agentWithRepresentative,
      submittedByPersonId: 7,
      submittedByPerson: submitter,
    };

    const result = getOpportunityContact(opportunity as any);

    expect(result).toEqual({
      id: 7,
      name: "Submitter Sam",
      phone: "+49-30-2222222",
      email: "sam@center.de",
      waysToContact: ["mobilePhone"],
    });
  });

  it("falls back to the agent representative when submittedByPerson is unset", () => {
    const opportunity = {
      agentId: 42,
      agent: agentWithRepresentative,
      submittedByPersonId: null,
      submittedByPerson: null,
    };

    const result = getOpportunityContact(opportunity as any);

    expect(result).toEqual({
      id: 100,
      name: "Coord Carla",
      phone: "+49-30-1111111",
      email: "carla@center.de",
      waysToContact: ["email"],
    });
  });

  it("falls back to the agent representative when the submitter no longer has an agent_person row for this agent", () => {
    const formerSubmitter = {
      id: 7,
      name: "Former Submitter",
      email: "old@center.de",
      agentPerson: [{ agentId: 999 }],
    };

    const opportunity = {
      agentId: 42,
      agent: agentWithRepresentative,
      submittedByPersonId: 7,
      submittedByPerson: formerSubmitter,
    };

    const result = getOpportunityContact(opportunity as any);

    expect(result.id).toBe(100);
    expect(result.name).toBe("Coord Carla");
  });

  it("falls back when the submitter has no agentPerson rows at all", () => {
    const looseSubmitter = {
      id: 7,
      name: "Loose Submitter",
      email: "loose@center.de",
      agentPerson: [],
    };

    const opportunity = {
      agentId: 42,
      agent: agentWithRepresentative,
      submittedByPersonId: 7,
      submittedByPerson: looseSubmitter,
    };

    const result = getOpportunityContact(opportunity as any);

    expect(result.id).toBe(100);
  });

  it("falls back when the opportunity has no agentId, even if submittedByPerson is set", () => {
    const submitter = {
      id: 7,
      name: "Sam",
      agentPerson: [{ agentId: 42 }],
    };

    const opportunity = {
      agentId: null,
      agent: agentWithRepresentative,
      submittedByPersonId: 7,
      submittedByPerson: submitter,
    };

    const result = getOpportunityContact(opportunity as any);

    expect(result.id).toBe(100);
  });
});

describe("dtoOpportunityGetList", () => {
  const baseOpportunity = {
    id: 1,
    title: "German tutoring",
    type: "volunteering",
    status: "opp-active",
    statusMatch: "opp-vol-matched",
    numberVolunteers: 2,
    createdAt: new Date("2026-01-01"),
    districtId: 5,
    agent: { title: "Center X" },
    accompanying: null,
    deal: {
      categoryId: 9,
      dealLanguage: [],
      dealActivity: [],
      dealDistrict: [],
      dealTimeslot: [],
    },
  };

  it("maps only opp-matched volunteers' names, skipping other statuses + rows with no person", () => {
    const opportunity = {
      ...baseOpportunity,
      opportunityVolunteer: [
        { status: "opp-matched", volunteer: { person: { name: "Jane Doe" } } },
        { status: "opp-matched", volunteer: { person: { name: "John Roe" } } },
        // not matched -> excluded
        {
          status: "opp-pending",
          volunteer: { person: { name: "Penny Pend" } },
        },
        { status: "opp-active", volunteer: { person: { name: "Active Al" } } },
        { status: "opp-past", volunteer: { person: { name: "Past Pat" } } },
        // matched but no person -> filtered out
        { status: "opp-matched", volunteer: { person: null } },
        { status: "opp-matched", volunteer: null },
      ],
    };

    expect(dtoOpportunityGetList(opportunity as any).volunteerNames).toEqual([
      "Jane Doe",
      "John Roe",
    ]);
  });

  it("passes masked names of matched volunteers through verbatim", () => {
    const opportunity = {
      ...baseOpportunity,
      opportunityVolunteer: [
        { status: "opp-matched", volunteer: { person: { name: "x*** y***" } } },
      ],
    };

    expect(dtoOpportunityGetList(opportunity as any).volunteerNames).toEqual([
      "x*** y***",
    ]);
  });

  it("yields an empty array when no volunteers are matched", () => {
    const opportunity = {
      ...baseOpportunity,
      opportunityVolunteer: [
        { status: "opp-pending", volunteer: { person: { name: "Penny" } } },
      ],
    };
    expect(dtoOpportunityGetList(opportunity as any).volunteerNames).toEqual(
      [],
    );
  });
});

describe("dtoOpportunityGet", () => {
  const eventDate = new Date("2026-06-15T09:30:00Z");

  const baseDetail = {
    id: 1,
    title: "Event opportunity",
    type: "events",
    status: "opp-active",
    statusMatch: "opp-vol-matched",
    numberVolunteers: 2,
    createdAt: new Date("2026-01-01"),
    districtId: 5,
    agentId: 42,
    agent: {
      title: "Center X",
      id: 42,
      type: "agent",
      name: "Some Agent",
      address: "123 Main St",
      district: { id: 1 },
      representative: {
        person: { id: 100, name: "Rep", phone: "", email: "" },
      },
    },
    accompanying: null,
    deal: {
      categoryId: 9,
      dealLanguage: [],
      dealActivity: [],
      dealSkill: [],
      dealDistrict: [],
      dealTimeslot: [],
    },
    comments: [],
    info: "",
    infoConfidential: "",
    opportunityVolunteer: [],
  };

  it("populates event from a one-time event timeslot", () => {
    const opportunity = {
      ...baseDetail,
      deal: {
        ...baseDetail.deal,
        dealTimeslot: [
          {
            timeslot: {
              id: 10,
              start: eventDate,
              end: null,
              rrule: null,
              occasional: null,
            },
          },
        ],
      },
    };

    const result = dtoOpportunityGet(opportunity as any);

    expect(result.event).toEqual({
      date: "2026-06-15",
      time: "09:30",
    });
  });

  it("returns undefined event when there are no dealTimeslots", () => {
    const opportunity = {
      ...baseDetail,
      deal: {
        ...baseDetail.deal,
        dealTimeslot: [],
      },
    };

    const result = dtoOpportunityGet(opportunity as any);

    expect(result.event).toBeUndefined();
  });

  it("returns undefined event when timeslots are recurring (have rrule)", () => {
    const opportunity = {
      ...baseDetail,
      deal: {
        ...baseDetail.deal,
        dealTimeslot: [
          {
            timeslot: {
              id: 11,
              start: new Date("2026-01-01T08:00:00Z"),
              end: new Date("2026-01-01T11:00:00Z"),
              rrule: "FREQ=WEEKLY;BYDAY=MO",
              occasional: null,
            },
          },
        ],
      },
    };

    const result = dtoOpportunityGet(opportunity as any);

    expect(result.event).toBeUndefined();
  });

  it("returns undefined event when timeslots are occasional", () => {
    const opportunity = {
      ...baseDetail,
      deal: {
        ...baseDetail.deal,
        dealTimeslot: [
          {
            timeslot: {
              id: 12,
              start: null,
              end: null,
              rrule: null,
              occasional: "weekends",
            },
          },
        ],
      },
    };

    const result = dtoOpportunityGet(opportunity as any);

    expect(result.event).toBeUndefined();
  });
});
