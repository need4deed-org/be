import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import District from "../location/district.entity";
import Postcode from "../location/postcode.entity";

@Entity()
export default class DistrictPostcode {
  constructor(districtPostcode?: Partial<DistrictPostcode>) {
    if (districtPostcode) {
      Object.assign(this, districtPostcode);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => District, (district) => district.districtPostcode, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "district_id" })
  district: District;

  @Column()
  districtId: number;

  @ManyToOne(() => Postcode, (postcode) => postcode.districtPostcode, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "postcode_id" })
  postcode: Postcode;

  @Column()
  postcodeId: number;
}
