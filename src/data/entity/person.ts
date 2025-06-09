import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Account } from "./account"; // Ensure this import is correct

@Entity()
export class Person {
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

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  address: string | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @OneToMany(() => Account, (account) => account.person)
  accounts: Account[];
}

export type PersonType = Person;
export type PersonCreateType = Omit<
  Person,
  "id" | "createdAt" | "updatedAt" | "accounts"
>;
export type PersonUpdateType = Partial<PersonCreateType> & { id: number };
export type PersonResponseType = Omit<Person, "accounts"> & {
  accounts: Account[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
};
