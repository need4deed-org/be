import { EventN4DType, Lang } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import EventN4D from "../../../data/entity/event/event.entity";
import { dtoEventN4DGetList } from "../../../services/dto/dto-event";

describe("dtoEventN4DGetList", () => {
  it("includes the host name for the calendar list", () => {
    const event = new EventN4D({
      id: 1,
      isActive: true,
      date: new Date("2026-10-20T13:00:00Z"),
      type: EventN4DType.PARTY,
      address: "Elsenstraße 87, Berlin",
      rsvpLink: "https://forms.example/rsvp",
      hostName: "Need4Deed",
      eventTranslation: [],
    });

    expect(dtoEventN4DGetList(event, Lang.DE, true)?.hostName).toBe(
      "Need4Deed",
    );
  });
});
