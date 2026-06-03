import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { OccasionalType } from "need4deed-sdk";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import DealTimeslot from "../m2m/deal-timeslot";

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

  @OneToMany(() => DealTimeslot, (dealTimeslot) => dealTimeslot.timeslot)
  dealTimeslot: DealTimeslot[];
}
