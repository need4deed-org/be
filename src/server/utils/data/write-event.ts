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

async function resolveLanguageIds(
  languages: string[],
): Promise<Map<string, number>> {
  const languageIds = new Map<string, number>();
  for (const isoCode of new Set(languages)) {
    languageIds.set(isoCode, await getLanguageIdByIsoCode(isoCode));
  }
  return languageIds;
}

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

export async function createEvent(input: ApiEventN4DCreate): Promise<EventN4D> {
  const languages = input.translations.map((t) => t.language);
  assertDistinctLanguages(languages);
  if (input.dateEnd && new Date(input.dateEnd) <= new Date(input.date)) {
    throw new BadRequestError("dateEnd must be after date.");
  }

  const languageIds = await resolveLanguageIds(languages);

  return dataSource.manager.transaction(async (manager) => {
    const eventRepository = getRepository(manager, EventN4D);
    const translationRepository = getRepository(manager, EventTranslation);

    const event = await eventRepository.save(
      new EventN4D({
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
