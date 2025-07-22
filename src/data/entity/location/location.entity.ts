import { IsOptional, IsString } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { LocationType } from "../../types";
import Deal from "../deal.entity";
import LocationAddress from "../m2m/location-address";
import LocationDistrict from "../m2m/location-district";
import LocationPostcode from "../m2m/location-postcode";

@Entity()
export default class Location {
  constructor(location?: Partial<Location>) {
    if (location) {
      Object.assign(this, location);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: LocationType,
    nullable: false,
    default: LocationType.DISTRICT,
  })
  type: LocationType;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  info: string;

  @OneToMany(
    () => LocationPostcode,
    (locationPostcode) => locationPostcode.location,
  )
  locationPostcode: LocationPostcode[];

  @OneToMany(
    () => LocationDistrict,
    (locationDistrict) => locationDistrict.location,
  )
  locationDistrict: LocationDistrict[];

  @OneToMany(
    () => LocationAddress,
    (locationAddress) => locationAddress.location,
  )
  locationAddress: LocationAddress[];

  @OneToMany(() => Deal, (deal) => deal.location)
  deal: Deal[];
}
