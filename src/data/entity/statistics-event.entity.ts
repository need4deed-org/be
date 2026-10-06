import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import District from "./location/district.entity";

// Append-only and anonymous (no person or volunteer id): one row per counted
// event, e.g. a ticked "where did you hear about us" answer. Read by the
// statistics endpoint, bucketed by occurred_at.
@Entity()
@Index(["metric", "occurredAt"])
export default class StatisticsEvent {
  constructor(event?: Partial<StatisticsEvent>) {
    if (event) {
      Object.assign(this, event);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  metric: string;

  @Column({ type: "timestamp" })
  occurredAt: Date;

  // What was counted, e.g. the lead_from option id or a match status.
  @Column({ type: "varchar" })
  valueKey: string;

  @ManyToOne(() => District, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "district_id" })
  district?: District;

  @Column({ nullable: true })
  districtId?: number;

  @Column({ type: "varchar", nullable: true })
  opportunityType?: string;
}
