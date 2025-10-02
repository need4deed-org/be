import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { EntityTableName } from "need4deed-sdk";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import Language from "./profile/language.entity";

@Entity()
@Index(["language", "entityType", "entityId", "fieldName"], {
  unique: true,
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

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  entityType: EntityTableName;

  @Column()
  @IsNotEmpty()
  entityId: number;

  @Column({ type: "text" })
  @IsNotEmpty()
  @IsString()
  translation: string;
}
