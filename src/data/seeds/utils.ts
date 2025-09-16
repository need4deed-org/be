import { DocumentStatusType, VolunteerStateType } from "need4deed-sdk";
import { Repository } from "typeorm";

import Activity from "../entity/profile/activity.entity";
import Category from "../entity/profile/category.entity";
import Language from "../entity/profile/language.entity";

export async function getLanguage(
  title: string,
  languageRepository: Repository<Language>,
) {
  const mapSpecialTitles = (title: string): string => {
    const map = {
      Bengal: "Bengali",
      Greek: "Modern Greek (1453-)",
      Kurmanji: "Northern Kurdish",
      Kurmanci: "Northern Kurdish",
      Northern: "Northern Kurdish",
      Sorani: "Central Kurdish",
      "Farsi/Dari": "Persian",
      Punjabi: "Panjabi",
    };
    return title in map ? map[title] : title;
  };
  const normalizedTitle = mapSpecialTitles(title);
  const language = await languageRepository.findOne({
    where: { title: normalizedTitle },
  });
  if (!language) {
    throw new Error(`Language with title "${normalizedTitle}" not found.`);
  }
  return language;
}

export async function getActivity(
  title,
  activityRepository: Repository<Activity>,
) {
  const activity = await activityRepository.findOne({
    where: { title },
  });
  if (!activity) {
    throw new Error(`Activity with title "${title}" not found.`);
  }
  return activity;
}

export async function getCategory(
  title,
  categoryRepository: Repository<Category>,
) {
  const category = await categoryRepository.findOne({
    where: { title },
  });
  if (!category) {
    throw new Error(`Category with title "${title}" not found.`);
  }
  return category;
}

export function getEnumValue<E>(enumType: object, value: E): E {
  if (Object.values(enumType).includes(value)) {
    return value;
  }
  return null;
}

export function getDocumentStatus(status: string): DocumentStatusType {
  const statusMap: Record<string, DocumentStatusType> = {
    "": DocumentStatusType.UNDEFINED,
    Applied: DocumentStatusType.APPLIED_SELF,
    Ja: DocumentStatusType.YES,
    Yes: DocumentStatusType.YES,
    "Yes through us": DocumentStatusType.YES,
    "asked to apply": DocumentStatusType.APPLIED_N4D,
    no: DocumentStatusType.NO,
    Nein: DocumentStatusType.NO,
    No: DocumentStatusType.NO,
  };
  return statusMap[status] || DocumentStatusType.UNDEFINED;
}

export function getVolunteerStatus(status: string): VolunteerStateType {
  if (!status) {
    return VolunteerStateType.NEW;
  }

  if (status.includes("Inactive")) {
    return VolunteerStateType.STALE;
  }

  if (status.includes("Active")) {
    return VolunteerStateType.ACTIVE;
  }

  return VolunteerStateType.MATCHED;
}

export async function getCount<R>(repository: Repository<R>): Promise<number> {
  const count = await repository
    .createQueryBuilder("r")
    .select("r.id")
    .getCount();

  return count;
}

const districts = {
  Mitte: "",
  "Friedrichshain-Kreuzberg": "",
  Pankow: "",
  "Charlottenburg-Wilmersdorf": "",
  Spandau: "",
  "Steglitz-Zehlendorf": "",
  "Tempelhof-Schöneberg": "",
  Neukölln: "",
  "Treptow-Köpenick": "",
  "Marzahn-Hellersdorf": "",
  Lichtenberg: "",
  Reinickendorf: "",
};

const mapDistricts = {
  Charlottenburg: "",
  Freidrichshain: "",
  Friedrichshain: "",
  Hellersdorf: "",
  Kreuzberg: "",
  Köpenick: "",
  Lichtenberg: "",
  Marzahn: "",
  "Marzahn-Hellersdorf": "",
  Mitte: "",
  Moabit: "",
  Neukölln: "",
  Pankow: "",
  "Phone translation": "",
  "Prenzlauer Berg": "",
  Reinickendorf: "",
  Remotely: "",
  Rudow: "",
  Schöneberg: "",
  Spandau: "",
  Steglitz: "",
  Tegel: "",
  Telefonisch: "",
  Tempelhof: "",
  Treptow: "",
  Wedding: "",
  Weißensee: "",
  Wilmersdorf: "",
  Zehlendorf: "",
};
