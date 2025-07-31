import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import Address from "./location/address.entity";
import Organization from "./organization.entity";
import User from "./user.entity"; // Ensure this import is correct
import Volunteer from "./volunteer/volunteer.entity";

@Entity()
export default class Person {
  constructor(person?: Partial<Person>) {
    if (person) {
      Object.assign(this, person);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @Column({ nullable: true })
  @IsOptional() // middleName is optional
  @IsString()
  middleName: string | null;

  @Column()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsEmail() // Validate as email if provided
  email: string | null;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(7, 20) // Example phone length validation
  phone: string | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @ManyToOne(() => Address, (address) => address.person, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "address_id" })
  address: Address;

  @Column()
  addressId: number;

  @OneToMany(() => User, (user) => user.person)
  users: User[];

  @OneToMany(() => Organization, (organization) => organization.person)
  organization: Organization[];

  @OneToMany(() => Volunteer, (volunteer) => volunteer.person)
  volunteer: Volunteer[];
}

export type PersonType = Person;
export type PersonCreateType = Omit<
  Person,
  "id" | "createdAt" | "updatedAt" | "accounts"
>;
export type PersonUpdateType = Partial<PersonCreateType> & { id: number };
export type PersonResponseType = Omit<Person, "accounts"> & {
  users: User[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
};
