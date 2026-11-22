import { IsOptional, IsString, MaxLength } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
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

  @Column({ type: "varchar", nullable: true, unique: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title: string | null;

  @Column({ type: "varchar", nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  street: string | null;

  @Column({ type: "varchar", nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city: string | null;

  @ManyToOne(() => Postcode, (postcode) => postcode.address, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "postcode_id" })
  postcode: Postcode;

  @Column()
  postcodeId: number;

  @OneToMany(() => Person, (person) => person.address)
  person: Person[];

  @OneToMany(() => Organization, (organization) => organization.address)
  organization: Organization[];
}
