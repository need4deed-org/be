import {
  ApiEventN4DCreate,
  ApiEventN4DPatch,
  ApiEventN4DTranslationInput,
} from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import EventTranslation from "../../../data/entity/event/event_translation.entity";
import EventN4D from "../../../data/entity/event/event.entity";
import { getRepository } from "../../../data/utils";
import { getLanguageIdByIsoCode } from "./get-language-title";

function assertDistinctLanguages(
  translations: ApiEventN4DTranslationInput[],
): void {
  const languages = translations.map((t) => t.language);
  if (new Set(languages).size !== languages.length) {
    throw new BadRequestError(
      "Each translation must use a different language.",
    );
  }
}

// Shared between create and update — an entry in `translations` is always a
// full representation of that language's content, not a field-by-field
// patch, so both paths map it the same way.
function translationFields(
  t: ApiEventN4DTranslationInput,
): Partial<EventTranslation> {
  return {
    title: t.title,
    subtitle: t.subTitle,
    menuTitle: t.menuTitle,
    timeStr: t.time,
    locationComment: t.locationComment,
    description: t.description,
    shortDescription: t.shortDescription,
    additionalTitle: t.additionalTitle,
    additionalInfo: t.additionalInfo,
    outro: t.outro,
    followupText: t.followUpText,
  };
}

// POST /event (be#904): one EventN4D row (structural fields) + one
// EventTranslation row per submitted language, in a transaction.
export async function createEvent(input: ApiEventN4DCreate): Promise<EventN4D> {
  assertDistinctLanguages(input.translations);
  if (input.dateEnd && new Date(input.dateEnd) <= new Date(input.date)) {
    throw new BadRequestError("dateEnd must be after date.");
  }

  // Resolve each distinct language once — the event's own languageId reuses
  // whichever id the first translation resolves to, rather than looking it
  // up a second time.
  const languageIds = new Map<string, number>();
  for (const isoCode of new Set(input.translations.map((t) => t.language))) {
    languageIds.set(isoCode, await getLanguageIdByIsoCode(isoCode));
  }

  return dataSource.manager.transaction(async (manager) => {
    const eventRepository = getRepository(manager, EventN4D);
    const translationRepository = getRepository(manager, EventTranslation);

    const event = await eventRepository.save(
      new EventN4D({
        // Matches the entity's own column default (false) — a created event
        // starts as a draft unless the coordinator explicitly publishes it.
        isActive: input.active ?? false,
        date: new Date(input.date),
        dateEnd: input.dateEnd ? new Date(input.dateEnd) : undefined,
        type: input.type,
        pic: input.pic,
        locationLink: input.locationLink,
        rsvpLink: input.linkRSVP,
        followupLink: input.followUpLink,
        address: input.address,
        hostName: input.hostName,
        // The language it was originally authored in — the first submitted
        // translation, by convention.
        languageId: languageIds.get(input.translations[0].language),
      }),
    );

    await translationRepository.save(
      input.translations.map(
        (t) =>
          new EventTranslation({
            eventn4dId: event.id,
            languageId: languageIds.get(t.language),
            ...translationFields(t),
          }),
      ),
    );

    return event;
  });
}

// PATCH /event/:id (be#905): structural fields are a plain partial update
// (omitted = unchanged; explicit null clears a nullable one — date/type/
// linkRSVP/address/active reject null at the schema level since they're
// required columns). translations is an upsert per (event, language): an
// included entry replaces that language's row entirely if one exists,
// otherwise inserts a new one; languages not mentioned are left untouched.
export async function updateEvent(
  id: number,
  input: ApiEventN4DPatch,
): Promise<EventN4D> {
  if (input.translations) {
    assertDistinctLanguages(input.translations);
  }

  return dataSource.manager.transaction(async (manager) => {
    const eventRepository = getRepository(manager, EventN4D);
    const translationRepository = getRepository(manager, EventTranslation);

    const event = await eventRepository.findOneBy({ id });
    if (!event) {
      throw new NotFoundError(`Event (id:${id}) not found.`);
    }

    const effectiveDate = input.date ? new Date(input.date) : event.date;
    const effectiveDateEnd =
      input.dateEnd === null
        ? null
        : input.dateEnd !== undefined
          ? new Date(input.dateEnd)
          : event.dateEnd;
    if (effectiveDateEnd && effectiveDateEnd <= effectiveDate) {
      throw new BadRequestError("dateEnd must be after date.");
    }

    Object.assign(event, {
      isActive: input.active,
      date: input.date ? new Date(input.date) : undefined,
      dateEnd: effectiveDateEnd,
      type: input.type,
      pic: input.pic,
      locationLink: input.locationLink,
      rsvpLink: input.linkRSVP,
      followupLink: input.followUpLink,
      address: input.address,
      hostName: input.hostName,
    });
    await eventRepository.save(event);

    for (const t of input.translations ?? []) {
      const languageId = await getLanguageIdByIsoCode(t.language);
      const existing = await translationRepository.findOneBy({
        eventn4dId: id,
        languageId,
      });

      await translationRepository.save(
        existing
          ? Object.assign(existing, translationFields(t))
          : new EventTranslation({
              eventn4dId: id,
              languageId,
              ...translationFields(t),
            }),
      );
    }

    return event;
  });
}
