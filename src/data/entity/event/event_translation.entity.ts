import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import Language from "../profile/language.entity";
import EventN4D from "./event.entity";

@Entity()
export default class EventTranslation {
  constructor(event?: Partial<EventTranslation>) {
    if (event) {
      Object.assign(this, event);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 256, nullable: true })
  title?: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  subtitle?: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  menu_title?: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  time_str?: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  location_comment?: string;

  @Column({ type: "text", nullable: false })
  description: string;

  @Column({ type: "varchar", length: 512, nullable: false })
  short_description: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  additional_title?: string;

  @Column({ type: "jsonb", nullable: true })
  additional_info?: any;

  @Column({ type: "text", nullable: true })
  outro?: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  followup_text?: string;

  @ManyToOne(() => EventN4D, (eventn4d) => eventn4d.event_translation)
  @JoinColumn({ name: "eventn4d_id" })
  eventn4d: EventN4D;

  @Column({ nullable: true })
  eventn4dId: number;

  @ManyToOne(() => Language, (language) => language.event_translation)
  @JoinColumn({ name: "language_id" })
  language: Language;

  @Column({ nullable: true })
  languageId: number;
}
