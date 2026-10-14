import { EventN4DType, Lang } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import EventTranslation from "../../../data/entity/event/event_translation.entity";
import EventN4D from "../../../data/entity/event/event.entity";
import Language from "../../../data/entity/profile/language.entity";
import {
  dtoEventN4DGet,
  dtoEventN4DGetList,
  resolveEventTranslation,
} from "../../../services/dto/dto-event";

const makeEvent = (
  hostName: string | null,
  eventTranslation: EventTranslation[] = [],
) =>
  new EventN4D({
    id: 1,
    isActive: true,
    date: new Date("2026-10-20T13:00:00Z"),
    type: EventN4DType.PARTY,
    address: "Elsenstraße 87, Berlin",
    rsvpLink: "https://forms.example/rsvp",
    hostName,
    eventTranslation,
  });

const makeTranslation = (id: number, isoCode: Lang, title: string) =>
  new EventTranslation({
    id,
    title,
    description: `${title} description`,
    shortDescription: `${title} short`,
    timeStr: `${title} time`,
    outro: `${title} outro`,
    language: new Language({ isoCode }),
  });

describe("dtoEventN4DGetList", () => {
  it("includes the host name for the calendar list", () => {
    expect(
      dtoEventN4DGetList(makeEvent("Need4Deed"), undefined, true)?.hostName,
    ).toBe("Need4Deed");
  });

  it("keeps a missing host name as null", () => {
    expect(
      dtoEventN4DGetList(makeEvent(null), undefined, true)?.hostName,
    ).toBeNull();
  });

  it("drops an untranslated event for a non-privileged caller", () => {
    expect(dtoEventN4DGetList(makeEvent(null), undefined, false)).toBeNull();
  });

  it("renders an untranslated event with blank text for a privileged caller", () => {
    expect(dtoEventN4DGetList(makeEvent(null), undefined, true)?.title).toBe(
      "",
    );
  });
});

describe("dtoEventN4DGet", () => {
  const event = makeEvent("Need4Deed", [
    makeTranslation(1, Lang.DE, "Fest"),
    makeTranslation(2, Lang.EN, "Party"),
  ]);

  it("takes list and detail fields from the same translation", () => {
    const dto = dtoEventN4DGet(event, Lang.EN, false);
    expect(dto).toMatchObject({
      title: "Party",
      time: "Party time",
      outro: "Party outro",
      hostName: "Need4Deed",
    });
    expect(resolveEventTranslation(event, Lang.EN)?.id).toBe(2);
  });

  it("hides an untranslated event from a non-privileged caller", () => {
    expect(dtoEventN4DGet(makeEvent(null), Lang.DE, false)).toBeNull();
  });

  it("shows an untranslated event to a privileged caller", () => {
    expect(dtoEventN4DGet(makeEvent(null), Lang.DE, true)?.title).toBe("");
  });
});
