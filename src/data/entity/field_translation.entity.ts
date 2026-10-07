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
@Index("IDX_field_translation_reference_text", ["translation"], {
  where: `"origin" = 'reference'`,
})
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

  @ManyToOne(() => Language, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "language_id" })
  language: Language;

  @Column({ nullable: true })
  languageId: number;

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

  @Column({ type: "varchar", length: 64, nullable: true })
  sourceHash: string | null;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: "varchar", length: 64, nullable: true })
  lastErrorCode: string | null;

  @Column({ type: "varchar", nullable: true })
  model: string | null;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Opportunity, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "opportunity_id" })
  opportunity?: Opportunity;
  @Column({ nullable: true })
  opportunityId?: number;

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
