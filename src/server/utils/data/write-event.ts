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

function assertDistinctLanguages(languages: string[]): void {
  if (new Set(languages).size !== languages.length) {
    throw new BadRequestError(
      "Each translation must use a different language.",
    );
  }
}

// Resolves each distinct submitted language once, up front — shared by
// create and update so neither issues a separate lookup per translation
// (or a duplicate one for whichever language is reused elsewhere).
async function resolveLanguageIds(
  languages: string[],
): Promise<Map<string, number>> {
  const languageIds = new Map<string, number>();
  for (const isoCode of new Set(languages)) {
    languageIds.set(isoCode, await getLanguageIdByIsoCode(isoCode));
  }
  return languageIds;
}

// An entry in `translations` is always a full representation of that
// language's content, never a field-by-field patch — so replacing an
// existing row must explicitly clear any optional field the caller omitted.
// `?? null` (not left as undefined) matters here: TypeORM's save() skips
// undefined properties, so leaving these as undefined on an update would
// silently keep the old value instead of clearing it (be#905 review).
function translationFields(
  t: ApiEventN4DTranslationInput,
): Partial<EventTranslation> {
  return {
    title: t.title,
    subtitle: t.subTitle ?? null,
    menuTitle: t.menuTitle,
    timeStr: t.time ?? null,
    locationComment: t.locationComment ?? null,
    description: t.description,
    shortDescription: t.shortDescription,
    additionalTitle: t.additionalTitle ?? null,
    additionalInfo: t.additionalInfo ?? null,
    outro: t.outro ?? null,
    followupText: t.followUpText ?? null,
  };
}

// POST /event (be#904): one EventN4D row (structural fields) + one
// EventTranslation row per submitted language, in a transaction.
export async function createEvent(input: ApiEventN4DCreate): Promise<EventN4D> {
  const languages = input.translations.map((t) => t.language);
  assertDistinctLanguages(languages);
  if (input.dateEnd && new Date(input.dateEnd) <= new Date(input.date)) {
    throw new BadRequestError("dateEnd must be after date.");
  }

  // The event's own languageId reuses whichever id the first translation
  // resolves to, rather than looking it up a second time.
  const languageIds = await resolveLanguageIds(languages);

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
// A unique (eventn4dId, languageId) DB constraint backs this — a concurrent
// PATCH race on the same event+language surfaces as a conflict rather than
// silently duplicating the row.
export async function updateEvent(
  id: number,
  input: ApiEventN4DPatch,
): Promise<EventN4D> {
  const languages = input.translations?.map((t) => t.language) ?? [];
  assertDistinctLanguages(languages);
  const languageIds = await resolveLanguageIds(languages);

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
      // Only rewritten when the caller actually touched it — effectiveDateEnd
      // falls back to the existing value otherwise, and assigning that
      // unchanged value would defeat TypeORM's undefined-skips-the-column
      // behavior on save(), issuing a needless UPDATE of this column.
      dateEnd: input.dateEnd !== undefined ? effectiveDateEnd : undefined,
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
      const languageId = languageIds.get(t.language);
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
