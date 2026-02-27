import { dataSource } from "../../../data/data-source";
import Language from "../../../data/entity/profile/language.entity";
import { getRepository } from "../../../data/utils";

export async function getLanguageTitle(isoCode: string): Promise<string> {
  const languageRepository = getRepository(dataSource, Language);
  const language = await languageRepository.findOneBy({ isoCode });
  return language?.title;
}
