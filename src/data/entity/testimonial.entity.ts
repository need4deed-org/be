import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import Person from "./person.entity";
import Language from "./profile/language.entity";

@Entity()
export default class Testimonial {
  constructor(testimonial?: Partial<Testimonial>) {
    if (testimonial) {
      Object.assign(this, testimonial);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "boolean", default: false })
  isActive: boolean;

  @Column({ type: "varchar", length: 256, nullable: true })
  name?: string;

  @Column({ type: "varchar", length: 256, nullable: true })
  pic?: string;

  @ManyToOne(() => Person, (person) => person.testimonial)
  @JoinColumn({ name: "person_id" })
  person: Person;

  @Column({ nullable: true })
  personId: number;

  @ManyToOne(() => Language, (language) => language.testimonial)
  @JoinColumn({ name: "language_id" })
  language: Language;

  @Column({ nullable: true })
  languageId: number;
}
