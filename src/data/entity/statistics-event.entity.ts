import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import District from "./location/district.entity";

export const LEAD_FROM_METRIC = "lead-from";

// Append-only and anonymous (no person or volunteer id): one row per counted
// event, e.g. a ticked "where did you hear about us" answer.
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

  // Set by the database, like the created_at columns other metrics bucket on.
  @CreateDateColumn()
  occurredAt: Date;

  // What was counted, e.g. the lead_from option id or a match status.
  @Column({ type: "varchar" })
  valueKey: string;

  @ManyToOne(() => District, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "district_id" })
  district?: District;

  @Index()
  @Column({ nullable: true })
  districtId?: number;

  @Column({ type: "varchar", nullable: true })
  opportunityType?: string;
}
