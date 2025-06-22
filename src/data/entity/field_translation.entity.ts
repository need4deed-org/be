import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import Language from "./language.entity";

@Entity()
@Index(["language", "entityName", "entityId", "fieldName"], {
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

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  entityName: string;

  @Column()
  @IsNotEmpty()
  entityId: number;

  @Column({ type: "text" })
  @IsNotEmpty()
  @IsString()
  translation: string;
}
