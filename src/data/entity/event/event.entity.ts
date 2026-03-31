import { EventN4DType } from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import { IsEnum } from "class-validator";
import Language from "../profile/language.entity";
import EventTranslation from "./event_translation.entity";

@Entity({ name: "event_n4d" })
export default class EventN4D {
  constructor(event?: Partial<EventN4D>) {
    if (event) {
      Object.assign(this, event);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "boolean", default: false })
  isActive: boolean;

  @Column({ type: "timestamptz" })
  date: Date;

  @Column({ type: "timestamptz", nullable: true })
  dateEnd?: Date;

  @Column({ type: "enum", enum: EventN4DType, default: EventN4DType.PARTY })
  @IsEnum(EventN4DType)
  type: EventN4DType;

  @Column({ type: "varchar", length: 256, nullable: true })
  pic?: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  locationLink?: string;

  @Column({ type: "varchar", length: 256 })
  rsvpLink: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  followupLink?: string;

  @Column({ type: "varchar", length: 256 })
  address: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  hostName?: string;

  @ManyToOne(() => Language, (language) => language.eventn4d)
  @JoinColumn({ name: "language_id" })
  language: Language;

  @Column({ nullable: true })
  languageId: number;

  @OneToMany(
    () => EventTranslation,
    (eventTranslation) => eventTranslation.eventn4d,
  )
  eventTranslation: EventTranslation[];
}
