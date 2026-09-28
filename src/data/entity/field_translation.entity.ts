import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { TranslationOrigin, TranslationStatus } from "need4deed-sdk";
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import LeadFrom from "./lead.entity";
import Opportunity from "./opportunity/opportunity.entity";
import Activity from "./profile/activity.entity";
import AgentType from "./profile/agent-type.entity";
import Category from "./profile/category.entity";
import Language from "./profile/language.entity";
import Service from "./profile/service.entity";
import Skill from "./profile/skill.entity";

// One row per source row × field × target language (be#1066). The source row
// is referenced by exactly one of the nullable FKs below, one per translated
// table, each ON DELETE CASCADE, so deleting the source removes its
// translations. The FK list must match src/services/translation/registry.ts;
// adding a table means a new FK column, its partial unique index, and a new
// CHECK, in a migration.
@Entity()
@Check(
  "CHK_field_translation_one_target",
  `num_nonnulls("opportunity_id", "translated_language_id", "category_id", "activity_id", "skill_id", "agent_type_id", "service_id", "lead_from_id") = 1`,
)
@Index(
  "UQ_field_translation_opportunity",
  ["opportunityId", "fieldName", "languageId"],
  { unique: true, where: `"opportunity_id" IS NOT NULL` },
)
@Index(
  "UQ_field_translation_translated_language",
  ["translatedLanguageId", "fieldName", "languageId"],
  { unique: true, where: `"translated_language_id" IS NOT NULL` },
)
@Index(
  "UQ_field_translation_category",
  ["categoryId", "fieldName", "languageId"],
  { unique: true, where: `"category_id" IS NOT NULL` },
)
@Index(
  "UQ_field_translation_activity",
  ["activityId", "fieldName", "languageId"],
  { unique: true, where: `"activity_id" IS NOT NULL` },
)
@Index("UQ_field_translation_skill", ["skillId", "fieldName", "languageId"], {
  unique: true,
  where: `"skill_id" IS NOT NULL`,
})
@Index(
  "UQ_field_translation_agent_type",
  ["agentTypeId", "fieldName", "languageId"],
  { unique: true, where: `"agent_type_id" IS NOT NULL` },
)
@Index(
  "UQ_field_translation_service",
  ["serviceId", "fieldName", "languageId"],
  { unique: true, where: `"service_id" IS NOT NULL` },
)
@Index(
  "UQ_field_translation_lead_from",
  ["leadFromId", "fieldName", "languageId"],
  { unique: true, where: `"lead_from_id" IS NOT NULL` },
)
// getInstanceByTranslation looks reference rows up by their translated text.
@Index("IDX_field_translation_reference_text", ["translation"], {
  where: `"origin" = 'reference'`,
})
// The MT worker's queue (be#1067).
@Index("IDX_field_translation_pending", ["updatedAt"], {
  where: `"status" = 'pending'`,
})
export default class FieldTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: "title" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fieldName: string;

  // Target language of `translation`.
  @ManyToOne(() => Language, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "language_id" })
  language: Language;

  @Column({ nullable: true })
  languageId: number;

  // NULL while the row is pending or failed; readers then serve the original.
  @Column({ type: "text", nullable: true })
  @IsOptional()
  @IsString()
  translation: string | null;

  @Column({
    type: "enum",
    enum: TranslationOrigin,
    default: TranslationOrigin.REFERENCE,
  })
  @IsEnum(TranslationOrigin)
  origin: TranslationOrigin;

  @Column({
    type: "enum",
    enum: TranslationStatus,
    default: TranslationStatus.DONE,
  })
  @IsEnum(TranslationStatus)
  status: TranslationStatus;

  // sha256 of the source text this translation was made from; a mismatch with
  // the current source means the row is outdated. NULL for reference rows.
  @Column({ type: "varchar", length: 64, nullable: true })
  sourceHash: string | null;

  @Column({ default: 0 })
  attempts: number;

  // Machine-readable reason of the last failure (e.g. "source_is_target");
  // never source or translated text.
  @Column({ type: "varchar", length: 64, nullable: true })
  lastErrorCode: string | null;

  // Provider/model that produced a machine row.
  @Column({ type: "varchar", nullable: true })
  model: string | null;

  @UpdateDateColumn()
  updatedAt: Date;

  // --- the translated row: exactly one of these is set ---

  @ManyToOne(() => Opportunity, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "opportunity_id" })
  opportunity?: Opportunity;
  @Column({ nullable: true })
  opportunityId?: number;

  // A Language reference row being translated (its title). Not to be
  // confused with `language`, the target language of every row.
  @ManyToOne(() => Language, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "translated_language_id" })
  translatedLanguage?: Language;
  @Column({ nullable: true })
  translatedLanguageId?: number;

  @ManyToOne(() => Category, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "category_id" })
  category?: Category;
  @Column({ nullable: true })
  categoryId?: number;

  @ManyToOne(() => Activity, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "activity_id" })
  activity?: Activity;
  @Column({ nullable: true })
  activityId?: number;

  @ManyToOne(() => Skill, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "skill_id" })
  skill?: Skill;
  @Column({ nullable: true })
  skillId?: number;

  @ManyToOne(() => AgentType, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "agent_type_id" })
  agentType?: AgentType;
  @Column({ nullable: true })
  agentTypeId?: number;

  @ManyToOne(() => Service, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "service_id" })
  service?: Service;
  @Column({ nullable: true })
  serviceId?: number;

  @ManyToOne(() => LeadFrom, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "lead_from_id" })
  leadFrom?: LeadFrom;
  @Column({ nullable: true })
  leadFromId?: number;
}
