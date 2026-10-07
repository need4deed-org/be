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

// Anonymous on purpose: no person or volunteer id.
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

  @CreateDateColumn()
  occurredAt: Date;

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
