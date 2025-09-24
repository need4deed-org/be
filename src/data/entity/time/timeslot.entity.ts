import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { OccasionalType } from "need4deed-sdk";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import TimeTimeslot from "../m2m/time-timeslot";

@Entity()
export default class Timeslot {
  constructor(timeslot?: Partial<Timeslot>) {
    if (timeslot) {
      Object.assign(this, timeslot);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  info: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  rrule: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsDate()
  start: Date;

  @Column({ nullable: true })
  @IsOptional()
  @IsDate()
  end: Date;

  @Column({
    nullable: true,
    type: "enum",
    enum: OccasionalType,
  })
  @IsOptional()
  @IsEnum(OccasionalType)
  occasional: OccasionalType;

  @OneToMany(() => TimeTimeslot, (timeTimeslot) => timeTimeslot.timeslot)
  timeTimeslot: TimeTimeslot[];
}
