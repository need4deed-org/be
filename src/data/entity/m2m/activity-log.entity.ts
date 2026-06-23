import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import OpportunityVolunteer from "./opportunity-volunteer";

@Entity()
export default class ActivityLog {
  constructor(partial?: Partial<ActivityLog>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date" })
  date: Date;

  // Stored as decimal to support fractional hours (e.g. 2.5).
  @Column({ type: "decimal", precision: 5, scale: 2 })
  hours: number;

  @ManyToOne(() => OpportunityVolunteer, (ov) => ov.activityLogs, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "opportunity_volunteer_id" })
  opportunityVolunteer: OpportunityVolunteer;

  @Column()
  opportunityVolunteerId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
