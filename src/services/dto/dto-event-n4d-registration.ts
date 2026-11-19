import {
  ApiEventN4DRegistrationGet,
  ApiVolunteerEventN4DGet,
  Lang,
} from "need4deed-sdk";
import EventN4DRegistration from "../../data/entity/event/event-n4d-registration.entity";
import { resolveEventTranslation } from "./dto-event";

export function dtoEventN4DRegistration(
  registration: EventN4DRegistration,
): ApiEventN4DRegistrationGet {
  return {
    id: registration.id,
    fullName: registration.fullName,
    email: registration.email,
    phone: registration.phone ?? null,
    numberOfPeople: registration.numberOfPeople,
    languagePreference: registration.languagePreference ?? null,
    message: registration.message ?? null,
    createdAt: registration.createdAt,
    isVolunteer: registration.isVolunteer,
    volunteerTypes: registration.volunteerTypes,
    volunteerId: registration.volunteerId ?? null,
    attended: registration.attended,
  };
}

export function dtoVolunteerEventN4D(
  registration: EventN4DRegistration,
  language: Lang,
): ApiVolunteerEventN4DGet {
  return {
    registrationId: registration.id,
    eventId: registration.eventId,
    title: resolveEventTranslation(registration.event, language)?.title ?? "",
    date: registration.event.date,
    attended: registration.attended,
  };
}
