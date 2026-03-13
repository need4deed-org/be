import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { UserRole } from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { verifyPassword } from "../utils";
import Communication from "./communication.entity";
import Person from "./person.entity";
import Appreciation from "./volunteer/appreciation.entity";

@Entity()
export default class User {
  constructor(user?: Partial<User>) {
    if (user) {
      Object.assign(this, user);
    }
  }

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

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ default: "en" })
  @IsString()
  language: string;

  @Column({ default: "CET" })
  @IsString()
  timezone: string;

  @ManyToOne(() => Person, (person) => person.users, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: "personId" })
  person: Person;

  @Column({ nullable: true })
  personId: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @OneToMany(() => Communication, (communication) => communication.user)
  communications: Communication[];

  @OneToMany(() => Appreciation, (appreciation) => appreciation.user)
  appreciations: Appreciation[];

  async checkPassword(password: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }
    return verifyPassword(password, this.password);
  }
}
