import { Repository } from "typeorm";
import Activity from "../entity/profile/activity.entity";
import Category from "../entity/profile/category.entity";
import Language from "../entity/profile/language.entity";
import { DocumentStatusType } from "../types";

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

export function getStartEnd(startEnd: string): { start: Date; end: Date } {
  const map = {
    not: null,
    Nicht: null,
    verfügbar: null,
    available: null,
    "8:00 - 10:00": { startHour: 8, endHour: 10 },
    "10:00 - 12:00": { start: 10, end: 12 },
    "14:00 - 16:00": { startHour: 14, endHour: 16 },
    "16:00 - 18:00": { startHour: 16, endHour: 18 },
    "18:00 - 20:00": { startHour: 18, endHour: 20 },
    "14-17": { startHour: 14, endHour: 17 },
    "17-20": { startHour: 17, endHour: 20 },
    "11-14": { startHour: 11, endHour: 14 },
    "08-11": { startHour: 8, endHour: 11 },
    morning: { startHour: 8, endHour: 10 },
    noon: { start: 11, end: 13 },
    afternoon: { start: 14, end: 16 },
    evening: { start: 17, end: 20 },
  };

  if (!map[startEnd]) {
    return null;
  }

  const { startHour, endHour } = map[startEnd];

  const start = new Date("2024-01-01");
  start.setHours(startHour, 0, 0, 0);
  const end = new Date("2024-01-01");
  end.setHours(endHour, 0, 0, 0);

  return { start, end };
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
