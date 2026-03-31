import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import District from "../location/district.entity";
import Location from "../location/location.entity";

@Entity()
export default class LocationDistrict {
  constructor(locationPostcode?: Partial<LocationDistrict>) {
    if (locationPostcode) {
      Object.assign(this, locationPostcode);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Location, (location) => location.locationDistrict, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column()
  locationId: number;

  @ManyToOne(() => District, (district) => district.locationDistrict, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "district_id" })
  district: District;

  @Column()
  districtId: number;
}
