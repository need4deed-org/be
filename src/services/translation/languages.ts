import { Lang } from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import Language from "../../data/entity/profile/language.entity";

export interface TranslatableEntity {
  id: number;
  originalLanguageId?: number | null;
}

export async function languageIds(
  manager: EntityManager,
): Promise<{ idOf: Record<Lang, number>; langOf: Map<number, Lang> }> {
  const langs = Object.values(Lang);
  const rows = await manager.find(Language, {
    where: { isoCode: In(langs) },
  });
  const idOf = {} as Record<Lang, number>;
  const langOf = new Map<number, Lang>();
  for (const row of rows) {
    idOf[row.isoCode as Lang] = row.id;
    langOf.set(row.id, row.isoCode as Lang);
  }
  const missing = langs.filter((lang) => idOf[lang] === undefined);
  if (missing.length > 0) {
    throw new Error(`Language rows missing: ${missing.join(", ")}`);
  }
  return { idOf, langOf };
}

export function originalLang(
  entity: TranslatableEntity,
  langOf: Map<number, Lang>,
): Lang {
  return (
    (entity.originalLanguageId && langOf.get(entity.originalLanguageId)) ||
    Lang.DE
  );
}
