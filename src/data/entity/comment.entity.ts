import { IsEnum, IsNotEmpty, IsString } from "class-validator";
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
import User from "./user.entity";

@Entity()
@Index(["language", "entityType", "entityId"], {
  unique: true,
})
export default class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  @IsNotEmpty()
  @IsString()
  text: string;

  @ManyToOne(() => Language, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "language_id" })
  language: Language;

  @Column({ nullable: true })
  languageId: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    type: "enum",
    enum: EntityTableName,
    default: EntityTableName.NONE,
  })
  @IsNotEmpty()
  @IsEnum(EntityTableName)
  entityType: EntityTableName;

  @Column()
  @IsNotEmpty()
  entityId: number;

  translation?: string;
}
