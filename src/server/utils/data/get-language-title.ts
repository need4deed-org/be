import { EntityNotFoundError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Language from "../../../data/entity/profile/language.entity";
import { getRepository } from "../../../data/utils";

export async function getLanguageTitle(isoCode: string): Promise<string> {
  const languageRepository = getRepository(dataSource, Language);
  const language = await languageRepository.findOneBy({ isoCode });
  return language?.title;
}

// Reference data is fixed and never mutated within a request, so this reads
// via the plain dataSource rather than needing to be transaction-aware.
export async function getLanguageIdByIsoCode(isoCode: string): Promise<number> {
  const languageRepository = getRepository(dataSource, Language);
  const language = await languageRepository.findOneBy({ isoCode });
  if (!language) {
    throw new EntityNotFoundError("Language", { isoCode });
  }
  return language.id;
}
