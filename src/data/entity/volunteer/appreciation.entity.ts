import { VolunteerStateAppreciationType } from "need4deed-sdk";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import Opportunity from "../opportunity/opportunity.entity";
import User from "../user.entity";
import Volunteer from "./volunteer.entity";

@Entity()
export default class Appreciation {
  constructor(appreciation?: Partial<Appreciation>) {
    if (appreciation) {
      Object.assign(this, appreciation);
    }
  }
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: VolunteerStateAppreciationType })
  title: VolunteerStateAppreciationType;

  @Column({ type: "timestamp", nullable: true })
  dateDue?: Date;

  @Column({ type: "timestamp", nullable: true })
  dateDelivery?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Opportunity, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "opportunity_id" })
  opportunity: Opportunity;

  @Column({ nullable: true })
  opportunityId: number;

  @ManyToOne(() => Volunteer, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "volunteer_id" })
  volunteer: Volunteer;

  @Column()
  volunteerId: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ nullable: true })
  userId: number;
}
