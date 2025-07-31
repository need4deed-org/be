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
import Agent from "./opportunity/agent.entity";
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

  @Column()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsEmail()
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

  @ManyToOne(() => Address, (address) => address.organization, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "address_id" })
  address: Address;

  @Column()
  addressId: number;

  @ManyToOne(() => Person, (person) => person.organization, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "person_id" })
  person: Person;

  @Column()
  personId: number;

  @OneToMany(() => Agent, (agent) => agent.organization)
  agent: Agent[];
}
