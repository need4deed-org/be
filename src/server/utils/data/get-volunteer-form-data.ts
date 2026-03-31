import {
  ApiLanguage,
  DocumentStatusType,
  LangProficiency,
  OptionId,
  VolunteerFormData,
  VolunteerLegacyFormData,
} from "need4deed-sdk";
import { getLanguageTitle } from "./get-language-title";

export async function getVolunteerFormData(
  body: VolunteerLegacyFormData,
): Promise<VolunteerFormData> {
  return {
    opportunityId: body.origin_opportunity,
    fullName: body.full_name,
    phone: body.phone,
    email: body.email,
    postcode: body.postal_code,
    goodConductCertificate:
      body.good_conduct_certificate.toLowerCase() as DocumentStatusType,
    measlesVaccination: body.if_measles_vaccination
      ? DocumentStatusType.YES
      : DocumentStatusType.NO,
    schedule: body.schedule.map(([day, daytime]) => {
      return [day, daytime.toLowerCase()] as unknown as [number, OptionId];
    }),
    districts: body.preferred_berlin_locations,
    languages: await Promise.all([
      ...body.native_languages.map(
        async (l) =>
          ({
            title: await getLanguageTitle(l),
            proficiency: LangProficiency.NATIVE,
          }) as ApiLanguage,
      ),
      ...body.fluent_languages.map(
        async (l) =>
          ({
            title: await getLanguageTitle(l),
            proficiency: LangProficiency.FLUENT,
          }) as ApiLanguage,
      ),
      ...body.intermediate_languages.map(
        async (l) =>
          ({
            title: await getLanguageTitle(l),
            proficiency: LangProficiency.INTERMEDIATE,
          }) as ApiLanguage,
      ),
    ]),
    activities: body.activities,
    skills: body.skills,
    leadFrom: body.lead_from.split(",").map((lf) => lf.trim()),
    comments: body.comments,
  };
}
