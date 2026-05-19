import { MigrationInterface, QueryRunner } from "typeorm";

const sqlDeleteDanish = `
DELETE FROM field_translation 
WHERE entity_type = 'language' 
  AND entity_id IN (SELECT id FROM language WHERE iso_code = 'da');
`;

const sqlFixTranslations = `
INSERT INTO field_translation (field_name, language_id, entity_type, entity_id, translation)
SELECT 
    'title'::varchar,
    target_lang.id AS language_id,
    'language'::field_translation_entity_type_enum,
    dari_lang.id AS entity_id,
    'Dari'::text AS translation
FROM (
    SELECT id, iso_code FROM language WHERE iso_code IN ('en', 'de')
) target_lang
CROSS JOIN (
    SELECT id FROM language WHERE iso_code = 'prs' LIMIT 1
) dari_lang
ON CONFLICT (language_id, entity_type, entity_id, field_name) 
DO UPDATE SET translation = EXCLUDED.translation;
`;

export class FixTranslationOfLanguageTitles1779186682996
  implements MigrationInterface
{
  name = "FixTranslationOfLanguageTitles1779186682996";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sqlDeleteDanish);
    await queryRunner.query(sqlFixTranslations);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
