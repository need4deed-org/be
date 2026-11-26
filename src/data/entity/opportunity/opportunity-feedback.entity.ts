import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import User from "../user.entity";
import Opportunity from "./opportunity.entity";

@Entity()
export default class OpportunityFeedback {
  constructor(partial?: Partial<OpportunityFeedback>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Opportunity, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "opportunity_id" })
  opportunity: Opportunity;

  @Index()
  @Column()
  opportunityId: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "author_user_id" })
  authorUser: User;

  @Column()
  authorUserId: number;

  @Column({ type: "text" })
  text: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
