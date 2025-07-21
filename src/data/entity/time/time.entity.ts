import { IsOptional, IsString } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import TimeTimeslot from "../m2m/time-timeslot";

@Entity()
export default class Time {
  constructor(time?: Partial<Time>) {
    if (time) {
      Object.assign(this, time);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  info: string;

  @OneToMany(() => TimeTimeslot, (timeTimeslot) => timeTimeslot.time)
  timeTimeslot: TimeTimeslot[];
}
