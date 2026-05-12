import { IsNotEmpty } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { IsPostcode } from "../../../services/validators/custom";
import { Country, GermanCity } from "../../types";
import Deal from "../deal.entity";
import DistrictPostcode from "../m2m/district-postcode";
import LocationPostcode from "../m2m/location-postcode";
import Accompanying from "../opportunity/accompanying.entity";
import Address from "./address.entity";

@Entity()
export default class Postcode {
  constructor(postcode?: Partial<Postcode>) {
    if (postcode) {
      Object.assign(this, postcode);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "numeric", precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ type: "numeric", precision: 9, scale: 7, nullable: true })
  latitude?: number;

  @Column()
  @IsNotEmpty()
  @IsPostcode(Country.DE, [GermanCity.BERLIN, GermanCity.POTSDAM])
  value: string;

  @OneToMany(
    () => LocationPostcode,
    (locationPostcode) => locationPostcode.postcode,
  )
  locationPostcode: LocationPostcode[];

  @OneToMany(
    () => DistrictPostcode,
    (districtPostcode) => districtPostcode.postcode,
  )
  districtPostcode: DistrictPostcode[];

  @OneToMany(() => Address, (address) => address.postcode)
  address: Address[];

  @OneToMany(() => Deal, (deal) => deal.postcode)
  deal: Deal[];

  @OneToMany(() => Accompanying, (accompanying) => accompanying.postcode)
  accompanying: Accompanying[];
}
