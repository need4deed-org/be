import { describe, expect, it, vi } from "vitest";
import {
  volunteerListSerializer,
  volunteerSerializer,
} from "../../../services/dto/dto-volunteer";

vi.mock("../../../services/dto/utils", () => ({
  getLanguages: vi.fn(() => [
    { id: "de", title: "German", proficiency: "fluent" },
  ]),
  getAvailability: vi.fn(() => [{ id: 1, day: "MO", daytime: "08-11" }]),
  getOptionItems: vi.fn(() => [{ id: 1, title: "Teaching" }]),
  getTitles: vi.fn(() => ["Teaching"]),
}));

function makeVolunteer(overrides = {}) {
  return {
    id: 1,
    statusEngagement: "active",
    statusType: "regular",
    statusCGC: "yes",
    statusVaccination: "yes",
    statusCgcProcess: null,
    statusCommunication: null,
    statusAppreciation: null,
    statusMatch: "vol-matched",
    dateReturn: null,
    preferredCommunicationType: "email",
    infoAbout: "About me",
    infoExperience: "Experience",
    statusVaccinationDate: null,
    statusCGCApplicationDate: null,
    statusCGCDate: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-06-01"),
    person: {
      id: 5,
      name: "Jane Doe",
      firstName: "Jane",
      lastName: "Doe",
      middleName: null,
      email: "jane@example.com",
      phone: "+491234567",
      landline: null,
      avatarUrl: "https://cdn.example.com/avatar.png",
      address: null,
    },
    deal: {
      dealActivity: [],
      dealSkill: [],
      dealLanguage: [],
      dealTimeslot: [],
      dealDistrict: [],
    },
    ...overrides,
  };
}

describe("volunteerListSerializer", () => {
  it("maps core volunteer fields to list shape", () => {
    const result = volunteerListSerializer(makeVolunteer() as any);

    expect(result).toBeDefined();
    expect(result!.id).toBe(1);
    expect(result!.statusEngagement).toBe("active");
    expect(result!.statusType).toBe("regular");
    expect(result!.name).toBe("Jane Doe");
    expect(result!.avatarUrl).toBe("https://cdn.example.com/avatar.png");
    expect(Array.isArray(result!.languages)).toBe(true);
    expect(Array.isArray(result!.activities)).toBe(true);
    expect(Array.isArray(result!.skills)).toBe(true);
    expect(Array.isArray(result!.locations)).toBe(true);
  });

  it("returns null avatarUrl when person has no avatar", () => {
    const v = makeVolunteer({
      person: { ...makeVolunteer().person, avatarUrl: null },
    });
    const result = volunteerListSerializer(v as any);
    expect(result).toBeDefined();
    expect(result!.avatarUrl).toBeNull();
  });
});

describe("volunteerSerializer", () => {
  it("maps all volunteer fields to the detail shape", () => {
    const comments: any[] = [
      {
        id: 10,
        text: "Good volunteer",
        entityId: 1,
        entityType: "volunteer",
        updatedAt: new Date("2025-02-01"),
        user: { id: 3, person: { name: "Coordinator A" } },
      },
    ];
    const timedEvents: any[] = [
      { id: 20, timestamp: new Date("2025-03-01"), content: "Matched" },
    ];

    const result = volunteerSerializer(
      makeVolunteer() as any,
      comments,
      timedEvents,
    );

    expect(result.id).toBe(1);
    expect(result.person.email).toBe("jane@example.com");
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].content).toBe("Good volunteer");
    expect(result.timelineLogs).toHaveLength(1);
    expect(result.timelineLogs[0].content).toBe("Matched");
    expect(result.statusMatch).toBe("vol-matched");
    expect(result.createdAt).toEqual(new Date("2025-01-01"));
  });

  it("uses 'Unknown Author' when comment user has no person", () => {
    const comments = [
      {
        id: 11,
        text: "Note",
        entityId: 1,
        entityType: "volunteer",
        updatedAt: new Date(),
        user: { id: 4 },
      },
    ];

    const result = volunteerSerializer(
      makeVolunteer() as any,
      comments as any,
      [],
    );
    expect(result.comments[0].authorName).toBe("Unknown Author");
  });
});
