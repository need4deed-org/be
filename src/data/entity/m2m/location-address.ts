import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import Address from "../location/address.entity";
import Location from "../location/location.entity";

@Entity()
export default class LocationAddress {
  constructor(locationAddress?: Partial<LocationAddress>) {
    if (locationAddress) {
      Object.assign(this, locationAddress);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Location, (location) => location.locationAddress, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column()
  locationId: number;

  @ManyToOne(() => Address, (address) => address.locationAddress, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "address_id" })
  address: Address;

  @Column()
  addressId: number;
}
