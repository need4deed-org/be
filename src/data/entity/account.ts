import {
  IsBoolean,
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
  PrimaryGeneratedColumn,
} from "typeorm";
import { Person } from "./person";

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true }) // Assuming email is unique for an account
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(8, 50) // Example password length
  password: string; // In a real app, this would be hashed!

  @Column({ default: false })
  @IsBoolean()
  isActive: boolean;

  @Column({ default: "user" })
  @IsString()
  role: string;

  @Column({ default: "en" })
  @IsString()
  language: string;

  @Column({ default: "CET" })
  @IsString()
  timezone: string;

  @ManyToOne(() => Person, (person) => person.accounts)
  @JoinColumn({ name: "personId" }) // This explicitly names the FK column
  person: Person;

  @Column() // This column will store the ID of the related Person
  personId: number; // Required to save the foreign key

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
