import { DataSource } from "typeorm";
import { seedEventsFile } from "../../../config/constants";
import logger from "../../../logger";
import { tryCatch } from "../../../services/utils";
import EventTranslation from "../../entity/event/event_translation.entity";
import EventN4D from "../../entity/event/event.entity";
import Language from "../../entity/profile/language.entity";
import { fetchJsonFromUrl, getRepository } from "../../utils";
import { getCount } from "../utils";
import { EventJSON } from "./types";

export async function seedEvents(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const eventRepository = getRepository(dataSource, EventN4D);

  const count = await getCount(eventRepository);
  if (count !== 0) {
    logger.info("Skipping seeding events.");
    return;
  }

  const languageRepository = getRepository(dataSource, Language);
  const translationRepository = getRepository(dataSource, EventTranslation);

  const events = (await fetchJsonFromUrl(seedEventsFile)) as EventJSON[];

  for (const eventJson of events ?? []) {
    try {
      const translations = eventJson.translations ?? [];
      if (!translations.length) {
        throw new Error("translations is empty.");
      }

      // Matches createEvent's convention: the event's own languageId is
      // whichever language the first submitted translation resolves to.
      const firstLanguage = await languageRepository.findOneBy({
        isoCode: translations[0].isoCode,
      });

      const newEvent = new EventN4D({
        isActive: eventJson.isActive,
        date: new Date(eventJson.date),
        dateEnd: eventJson.dateEnd ? new Date(eventJson.dateEnd) : undefined,
        type: eventJson.type,
        pic: eventJson.pic,
        locationLink: eventJson.locationLink,
        rsvpLink: eventJson.rsvpLink,
        followupLink: eventJson.followupLink,
        address: eventJson.address,
        hostName: eventJson.hostName,
        languageId: firstLanguage?.id,
      });
      await eventRepository.save(newEvent);

      for (const t of translations) {
        const language = await languageRepository.findOneBy({
          isoCode: t.isoCode,
        });
        if (!language) {
          logger.warn(
            `Language ${t.isoCode} not found for event ${eventJson.nid}. Skipping translation.`,
          );
          continue;
        }

        const [, error] = await tryCatch(
          translationRepository.save(
            new EventTranslation({
              eventn4dId: newEvent.id,
              languageId: language.id,
              title: t.title,
              subtitle: t.subtitle,
              menuTitle: t.menuTitle,
              timeStr: t.timeStr,
              locationComment: t.locationComment,
              description: t.description,
              shortDescription: t.shortDescription,
              additionalTitle: t.additionalTitle,
              additionalInfo: t.additionalInfo,
              outro: t.outro,
              followupText: t.followupText,
            }),
          ),
        );
        if (error) {
          logger.warn(
            `Storing translation (${t.isoCode}) for event ${eventJson.nid} occurred: ${error}`,
          );
        }
      }
    } catch (error) {
      logger.info(
        `Creation of event ${eventJson?.nid} rolled back due to error: ${(error as Error).message}`,
      );
    }
  }
}
