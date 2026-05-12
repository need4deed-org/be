import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { TranslatedIntoType } from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import Postcode from "../location/postcode.entity";
import Opportunity from "./opportunity.entity";

@Entity()
export default class Accompanying {
  constructor(accompanying?: Partial<Accompanying>) {
    if (accompanying) {
      Object.assign(this, accompanying);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsString()
  address: string;

  @Column()
  @IsString()
  name: string;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  email?: string;

  @Column({ type: "timestamptz" })
  @IsDate()
  date: Date;

  @Column({ type: "enum", enum: TranslatedIntoType, nullable: true })
  @IsOptional()
  @IsEnum(TranslatedIntoType)
  languageToTranslate?: TranslatedIntoType;

  @ManyToOne(() => Postcode, (postcode) => postcode.accompanying, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "postcode_id" })
  postcode?: Postcode;

  @OneToMany(() => Opportunity, (opportunity) => opportunity.accompanying)
  opportunity: Opportunity;

  langCode: number;
}
