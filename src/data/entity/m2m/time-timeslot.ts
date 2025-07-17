import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import Time from "../time/time";
import Timeslot from "../time/timeslot";

@Entity()
export default class TimeTimeslot {
  constructor(timeTimeslot?: Partial<TimeTimeslot>) {
    if (timeTimeslot) {
      Object.assign(this, timeTimeslot);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Time, (time) => time.timeTimeslot, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "time_id" })
  time: Time;

  @Column()
  timeId: number;

  @ManyToOne(() => Timeslot, (timeslot) => timeslot.timeTimeslot, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "timeslot_id" })
  timeslot: Timeslot;

  @Column()
  timeslotId: number;
}
