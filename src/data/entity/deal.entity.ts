import { IsEnum, IsOptional, IsString } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DealType } from "../types";
import Postcode from "./location/postcode.entity";
import DealActivity from "./m2m/deal-activity";
import DealDistrict from "./m2m/deal-district";
import DealLanguage from "./m2m/deal-language";
import DealSkill from "./m2m/deal-skill";
import DealTimeslot from "./m2m/deal-timeslot";
import Opportunity from "./opportunity/opportunity.entity";
import Category from "./profile/category.entity";
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
  @IsEnum(DealType)
  type: DealType;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  info?: string;

  @ManyToOne(() => Category, (category) => category.deal, {
    nullable: true,
  })
  @JoinColumn({ name: "category_id" })
  category?: Category;

  @Column({ nullable: true })
  categoryId: number;

  @ManyToOne(() => Postcode, (postcode) => postcode.deal, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "postcode_id" })
  postcode: Postcode;

  @Column()
  postcodeId: number;

  @OneToMany(() => DealActivity, (dealActivity) => dealActivity.deal)
  dealActivity: DealActivity[];

  @OneToMany(() => DealSkill, (dealSkill) => dealSkill.deal)
  dealSkill: DealSkill[];

  @OneToMany(() => DealLanguage, (dealLanguage) => dealLanguage.deal)
  dealLanguage: DealLanguage[];

  @OneToMany(() => DealTimeslot, (dealTimeslot) => dealTimeslot.deal)
  dealTimeslot: DealTimeslot[];

  @OneToMany(() => DealDistrict, (dealDistrict) => dealDistrict.deal)
  dealDistrict: DealDistrict[];

  @OneToMany(() => Opportunity, (opportunity) => opportunity.deal)
  opportunity: Opportunity[];

  @OneToMany(() => Volunteer, (volunteer) => volunteer.deal)
  volunteer: Volunteer[];
}
