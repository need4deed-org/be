import { DataSource } from "typeorm";

import { seedLanguageFile } from "../../config/constants";
import Language from "../entity/profile/language.entity";
import { readJsonAsync } from "../utils";
import { getCount, getRepository } from "./utils";

interface LanguageJSON {
  iso_code: string;
  title: string;
}

export async function seedLanguage(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const languageRepository = getRepository(dataSource, Language);

  const count = await getCount(languageRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding languages.");
    return;
  }

  const languages = (await readJsonAsync(seedLanguageFile)) as LanguageJSON[];

  const existingIsoCodes = new Set(
    (await languageRepository.find()).map((language) => language.isoCode),
  );

  const languagesForInsert = languages.reduce(
    (result: Language[], { iso_code, title }) => {
      if (existingIsoCodes.has(iso_code)) {
        return result;
      }
      try {
        const newLanguage = new Language({ isoCode: iso_code, title });
        result.push(newLanguage);
      } catch (error) {
        throw new Error(
          `Error creating new language ${iso_code}/${title}: ${error.message}`,
        );
      }
      return result;
    },
    [],
  );

  try {
    await languageRepository.insert(languagesForInsert);
  } catch (error) {
    throw new Error(`Error inserting languages: ${error.message}`);
  }
}
