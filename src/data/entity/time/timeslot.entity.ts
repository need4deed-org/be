import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { OccasionalType } from "../../../server/types";
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
  description: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  rrule: string;

  @Column()
  @IsNotEmpty()
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
  occasional: OccasionalType;

  @OneToMany(() => TimeTimeslot, (timeTimeslot) => timeTimeslot.timeslot)
  timeTimeslot: TimeTimeslot[];
}
