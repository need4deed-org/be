import { IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Opportunity from "./opportunity/opportunity.entity";

@Entity()
export default class OpportunityEventRegistration {
  constructor(
    opportunityEventRegistration?: Partial<OpportunityEventRegistration>,
  ) {
    if (opportunityEventRegistration) {
      Object.assign(this, opportunityEventRegistration);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Opportunity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "opportunity_id" })
  opportunity: Opportunity;

  @Column()
  opportunityId: number;

  @Column()
  @IsString()
  fullName: string;

  @Column()
  @IsString()
  email: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Column({ default: 1 })
  @IsInt()
  numberOfPeople: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  languagePreference?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @CreateDateColumn()
  createdAt: Date;
}
