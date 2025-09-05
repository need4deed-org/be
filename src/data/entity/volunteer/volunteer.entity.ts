import { IsOptional, IsString } from "class-validator";
import { DocumentStatusType } from "need4deed-sdk";

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Deal from "../deal.entity";
import Person from "../person.entity";

@Entity()
export default class Volunteer {
  constructor(volunteer?: Partial<Volunteer>) {
    if (volunteer) {
      Object.assign(this, volunteer);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsOptional()
  @IsString()
  info: string;

  @Column({
    type: "enum",
    enum: DocumentStatusType,
    default: DocumentStatusType.UNDEFINED,
  })
  statusVaccination: DocumentStatusType;

  @Column({
    type: "enum",
    enum: DocumentStatusType,
    default: DocumentStatusType.UNDEFINED,
  })
  statusCGC: DocumentStatusType;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @ManyToOne(() => Deal)
  @JoinColumn({ name: "deal_id" })
  deal: Deal;

  @Column({ nullable: true })
  dealId: number;

  @ManyToOne(() => Person)
  @JoinColumn({ name: "person_id" })
  person: Person;

  @Column({ nullable: true })
  personId: number;
}
