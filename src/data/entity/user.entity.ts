import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Person } from "./person.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  password: string;

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

  @ManyToOne(() => Person, (person) => person.users)
  @JoinColumn({ name: "personId" })
  person: Person;

  @Column()
  personId: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
