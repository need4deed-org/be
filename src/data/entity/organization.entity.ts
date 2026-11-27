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
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import Address from "./location/address.entity";
import OrganizationPerson from "./m2m/organization-person";
import Person from "./person.entity";
import Language from "./profile/language.entity";

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
  @Length(7, 20)
  phone?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  website?: string;

  @Column({ type: "text", nullable: true })
  @IsOptional()
  @IsString()
  about?: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => Address, (address) => address.organization, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "address_id" })
  address?: Address;

  @Column({ type: "integer", nullable: true })
  addressId?: number | null;

  @ManyToOne(() => Person, (person) => person.organization, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "person_id" })
  person?: Person;

  @Column({ nullable: true })
  personId?: number;

  @ManyToOne(() => Language, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "original_language_id" })
  originalLanguage?: Language;
  @Column({ nullable: true })
  originalLanguageId?: number;

  @OneToMany(
    () => OrganizationPerson,
    (organizationPerson) => organizationPerson.organization,
  )
  organizationPerson: OrganizationPerson[];
}
