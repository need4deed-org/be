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
import { verifyPassword } from "../utils";
import { Person } from "./person.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Column()
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

  @ManyToOne(() => Person, (person) => person.users, {
    nullable: true,
  })
  @JoinColumn({ name: "personId" })
  person: Person;

  @Column({ nullable: true })
  personId: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  async checkPassword(password: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }
    return verifyPassword(password, this.password);
  }
}
