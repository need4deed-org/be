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
@Index(["entityType", "entityId", "languageId"], { unique: false })
export default class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  @IsNotEmpty()
  @IsString()
  text: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

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

  @Column()
  userId: number;

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
