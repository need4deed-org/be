import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DealType } from "../types";
import Location from "./location/location.entity";
import Opportunity from "./opportunity/opportunity.entity";
import Profile from "./profile/profile.entity";
import Time from "./time/time.entity";
import Volunteer from "./volunteer/volunteer.entity";

@Entity()
export default class Deal {
  constructor(deal?: Partial<Deal>) {
    if (deal) {
      Object.assign(this, deal);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: DealType,
    nullable: false,
  })
  type: DealType;

  @ManyToOne(() => Profile, (profile) => profile.deal, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "profile_id" })
  profile: Profile;

  @Column()
  postcodeId: number;

  @ManyToOne(() => Time, (time) => time.deal, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "time_id" })
  time: Time;

  @Column()
  timeId: number;

  @ManyToOne(() => Location, (location) => location.deal, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column()
  locationId: number;

  @OneToMany(() => Opportunity, (opportunity) => opportunity.deal)
  opportunity: Opportunity[];

  @OneToMany(() => Volunteer, (volunteer) => volunteer.deal)
  volunteer: Volunteer[];
}
