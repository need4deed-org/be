import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import Postcode from "./postcode.entity";

@Entity()
export default class PostcodeCommute {
  constructor(postcodeCommute?: Partial<PostcodeCommute>) {
    if (postcodeCommute) {
      Object.assign(this, postcodeCommute);
    }
  }

  @PrimaryColumn()
  fromPostcodeId: number;

  @ManyToOne(() => Postcode, { onDelete: "CASCADE" })
  @JoinColumn({ name: "from_postcode_id" })
  fromPostcode: Postcode;

  @PrimaryColumn()
  @Index()
  toPostcodeId: number;

  @ManyToOne(() => Postcode, { onDelete: "CASCADE" })
  @JoinColumn({ name: "to_postcode_id" })
  toPostcode: Postcode;

  @Column()
  minutes: number;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
