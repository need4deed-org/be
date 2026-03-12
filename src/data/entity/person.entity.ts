import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import { PreferredCommunicationType } from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import Address from "./location/address.entity";
import AgentPerson from "./m2m/agent-person";
import Organization from "./organization.entity";
import Testimonial from "./testimonial.entity";
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
  @IsOptional()
  @IsString()
  middleName?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsEmail() // Validate as email if provided
  email?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(7, 20) // Example phone length validation
  phone?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @Column({
    type: "text",
    array: true,
    default: () => "'{mobilePhone}'",
    transformer: {
      to: (value: PreferredCommunicationType[]) => value,
      from: (value: unknown) => value as PreferredCommunicationType[],
    },
  })
  preferredCommunicationType: PreferredCommunicationType[];

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @ManyToOne(() => Address, (address) => address.person, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "address_id" })
  address: Address;

  @Column({ nullable: true })
  addressId: number;

  @OneToMany(() => User, (user) => user.person)
  users: User[];

  @OneToMany(() => Organization, (organization) => organization.person)
  organization: Organization[];

  @OneToMany(() => Volunteer, (volunteer) => volunteer.person)
  volunteer: Volunteer[];

  @OneToMany(() => Testimonial, (testimonial) => testimonial.person)
  testimonial: Testimonial[];

  @OneToMany(() => AgentPerson, (agentPerson) => agentPerson.person)
  agentPerson: AgentPerson[];

  get name(): string {
    return [this.firstName, this.middleName, this.lastName]
      .filter(Boolean)
      .join(" ");
  }
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
