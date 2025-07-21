import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import Location from "../location/location.entity";
import Postcode from "../location/postcode.entity";

@Entity()
export default class LocationPostcode {
  constructor(locationPostcode?: Partial<LocationPostcode>) {
    if (locationPostcode) {
      Object.assign(this, locationPostcode);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Location, (location) => location.locationPostcode, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column()
  locationId: number;

  @ManyToOne(() => Postcode, (postcode) => postcode.locationPostcode, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "postcode_id" })
  postcode: Postcode;

  @Column()
  postcodeId: number;
}
