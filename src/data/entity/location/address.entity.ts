import { IsString, Length } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import LocationAddress from "../m2m/location-address";
import Organization from "../organization.entity";
import Person from "../person.entity";
import Postcode from "./postcode.entity";

@Entity()
export default class Address {
  constructor(address?: Partial<Address>) {
    if (address) {
      Object.assign(this, address);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, unique: true })
  @IsString()
  @Length(100)
  title: string;

  @Column({ nullable: true })
  @IsString()
  @Length(200)
  street: string;

  @Column({ nullable: true })
  @IsString()
  @Length(100)
  city: string;

  @ManyToOne(() => Postcode, (postcode) => postcode.address, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "postcode_id" })
  postcode: Postcode;

  @Column()
  postcodeId: number;

  @OneToMany(
    () => LocationAddress,
    (locationAddress) => locationAddress.address,
  )
  locationAddress: LocationAddress[];

  @OneToMany(() => Person, (person) => person.address)
  person: Person[];

  @OneToMany(() => Organization, (organization) => organization.address)
  organization: Organization[];
}
