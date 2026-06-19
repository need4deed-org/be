import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import Deal from "../deal.entity";
import Timeslot from "../time/timeslot.entity";

@Entity()
@Unique(["dealId", "timeslotId"])
export default class DealTimeslot {
  constructor(dealTimeslot?: Partial<DealTimeslot>) {
    if (dealTimeslot) {
      Object.assign(this, dealTimeslot);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Deal, (deal) => deal.dealTimeslot, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "deal_id" })
  deal: Deal;

  @Column()
  dealId: number;

  @ManyToOne(() => Timeslot, (timeslot) => timeslot.dealTimeslot, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "timeslot_id" })
  timeslot: Timeslot;

  @Column()
  timeslotId: number;
}
