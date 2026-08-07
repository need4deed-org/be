import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import Address from "./location/address.entity";
import Person from "./person.entity";

@Entity()
export default class Organization {
  constructor(organization?: Partial<Organization>) {
    if (organization) {
      Object.assign(this, organization);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  title: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(7, 20) // Example phone length validation
  phone?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  website?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Address, (address) => address.organization, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "address_id" })
  address?: Address;

  // Nullable (be#843): a bulk-imported organization (e.g. seeded from a known
  // domain list) may not have a known address yet — that's a legitimate
  // "not yet known" state, not an error condition.
  @Column({ nullable: true })
  addressId?: number;

  @ManyToOne(() => Person, (person) => person.organization, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "person_id" })
  person?: Person;

  // Nullable (be#843): same reasoning as addressId — a bulk-imported
  // organization may not have an assigned primary contact yet.
  @Column({ nullable: true })
  personId?: number;
}
