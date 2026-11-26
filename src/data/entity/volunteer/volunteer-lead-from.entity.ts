import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import LeadFrom from "../lead.entity";
import StatisticsEvent from "../statistics-event.entity";
import Volunteer from "./volunteer.entity";

@Entity()
export default class VolunteerLeadFrom {
  @PrimaryColumn()
  volunteerId: number;

  @ManyToOne(() => Volunteer, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "volunteer_id" })
  volunteer: Volunteer;

  @Index()
  @PrimaryColumn()
  leadFromId: number;

  @ManyToOne(() => LeadFrom, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "lead_from_id" })
  leadFrom: LeadFrom;

  @Column({ type: "integer", nullable: true, unique: true })
  statisticsEventId: number | null;

  @ManyToOne(() => StatisticsEvent, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "statistics_event_id" })
  statisticsEvent: StatisticsEvent | null;
}
