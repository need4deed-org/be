import { IsEnum } from "class-validator";
import { LangProficiency, LangPurpose } from "need4deed-sdk";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import Deal from "../deal.entity";
import Language from "../profile/language.entity";

@Entity()
export default class DealLanguage {
  constructor(dealLanguage?: Partial<DealLanguage>) {
    if (dealLanguage) Object.assign(this, dealLanguage);
  }
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true, type: "enum", enum: LangProficiency, default: LangProficiency.ADVANCED })
  @IsEnum(LangProficiency) proficiency: LangProficiency;
  @Column({ nullable: true, type: "enum", enum: LangPurpose, default: LangPurpose.GENERAL })
  @IsEnum(LangPurpose) purpose: LangPurpose;
  @ManyToOne(() => Deal, (deal) => deal.dealLanguage, { onDelete: "CASCADE" })
  @JoinColumn({ name: "deal_id" }) deal: Deal;
  @Column() dealId: number;
  @ManyToOne(() => Language, (language) => language.profileLanguage, { onDelete: "CASCADE" })
  @JoinColumn({ name: "language_id" }) language: Language;
  @Column() languageId: number;
}
