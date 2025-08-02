import { EventN4DType } from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import Language from "../profile/language.entity";
import EventTranslation from "./event_translation.entity";

@Entity()
export default class EventN4D {
  constructor(event?: Partial<EventN4D>) {
    if (event) {
      Object.assign(this, event);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "boolean", default: false })
  active: boolean;

  @Column({ type: "timestamptz" })
  date: Date;

  @Column({ type: "timestamptz", nullable: true })
  date_end?: Date;

  @Column({ type: "enum", enum: EventN4DType, default: EventN4DType.PARTY })
  type: EventN4DType;

  @Column({ type: "varchar", length: 256, nullable: true })
  pic?: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  location_link?: string;

  @Column({ type: "varchar", length: 256 })
  rsvp_link: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  followup_link?: string;

  @Column({ type: "varchar", length: 256 })
  address: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  host_name?: string;

  @ManyToOne(() => Language, (language) => language.eventn4d)
  @JoinColumn({ name: "language_id" })
  language: Language;

  @Column({ nullable: true })
  languageId: number;

  @OneToMany(
    () => EventTranslation,
    (event_translation) => event_translation.eventn4d,
  )
  event_translation: EventTranslation[];
}
