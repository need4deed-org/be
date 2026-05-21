import { IsNotEmpty, IsString, Length } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import DistrictPostcode from "../m2m/district-postcode";
import LocationDistrict from "../m2m/location-district";
import Agent from "../opportunity/agent.entity";
import Opportunity from "../opportunity/opportunity.entity";

@Entity()
export default class District {
  constructor(district?: Partial<District>) {
    if (district) {
      Object.assign(this, district);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;

  @OneToMany(() => Agent, (agent) => agent.district)
  agents: Agent[];

  @OneToMany(() => Opportunity, (opportunity) => opportunity.district)
  opportunities: Opportunity[];

  @OneToMany(
    () => LocationDistrict,
    (locationDistrict) => locationDistrict.district,
  )
  locationDistrict: LocationDistrict[];

  @OneToMany(
    () => DistrictPostcode,
    (districtPostcode) => districtPostcode.district,
  )
  districtPostcode: DistrictPostcode[];
}
