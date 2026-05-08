import { IsEnum } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DealType } from "../types";
import Location from "./location/location.entity";
import Postcode from "./location/postcode.entity";
import DealActivity from "./m2m/deal-activity";
import DealLanguage from "./m2m/deal-language";
import DealSkill from "./m2m/deal-skill";
import Opportunity from "./opportunity/opportunity.entity";
import Time from "./time/time.entity";
import Volunteer from "./volunteer/volunteer.entity";

@Entity()
export default class Deal {
  constructor(deal?: Partial<Deal>) {
    if (deal) Object.assign(this, deal);
  }
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: "enum", enum: DealType, nullable: false })
  @IsEnum(DealType) type: DealType;
  @Column({ nullable: true }) categoryId: number | null;
  @ManyToOne(() => Postcode, (postcode) => postcode.deal, { onDelete: "CASCADE" })
  @JoinColumn({ name: "postcode_id" }) postcode: Postcode;
  @Column() postcodeId: number;
  @ManyToOne(() => Time, (time) => time.deal, { onDelete: "CASCADE" })
  @JoinColumn({ name: "time_id" }) time: Time;
  @Column() timeId: number;
  @ManyToOne(() => Location, (location) => location.deal, { onDelete: "CASCADE" })
  @JoinColumn({ name: "location_id" }) location: Location;
  @Column() locationId: number;
  @OneToMany(() => DealActivity, (dealActivity) => dealActivity.deal)
  dealActivity: DealActivity[];
  @OneToMany(() => DealSkill, (dealSkill) => dealSkill.deal)
  dealSkill: DealSkill[];
  @OneToMany(() => DealLanguage, (dealLanguage) => dealLanguage.deal)
  dealLanguage: DealLanguage[];
  @OneToMany(() => Opportunity, (opportunity) => opportunity.deal)
  opportunity: Opportunity[];
  @OneToMany(() => Volunteer, (volunteer) => volunteer.deal)
  volunteer: Volunteer[];
}
