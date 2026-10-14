import { EventN4DType, Lang } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import EventN4D from "../../../data/entity/event/event.entity";
import { dtoEventN4DGetList } from "../../../services/dto/dto-event";

describe("dtoEventN4DGetList", () => {
  const makeEvent = (hostName: string | null) =>
    new EventN4D({
      id: 1,
      isActive: true,
      date: new Date("2026-10-20T13:00:00Z"),
      type: EventN4DType.PARTY,
      address: "Elsenstraße 87, Berlin",
      rsvpLink: "https://forms.example/rsvp",
      hostName,
      eventTranslation: [],
    });

  it("includes the host name for the calendar list", () => {
    expect(
      dtoEventN4DGetList(makeEvent("Need4Deed"), Lang.DE, true)?.hostName,
    ).toBe("Need4Deed");
  });

  it("keeps a missing host name as null", () => {
    expect(
      dtoEventN4DGetList(makeEvent(null), Lang.DE, true)?.hostName,
    ).toBeNull();
  });
});
