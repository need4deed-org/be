import { IsEnum } from "class-validator";
import { OpportunityVolunteerStatusType } from "need4deed-sdk";
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
import Volunteer from "../volunteer/volunteer.entity";

@Entity()
export default class OpportunityVolunteer {
  constructor(opportunityVolunteer?: Partial<OpportunityVolunteer>) {
    if (opportunityVolunteer) {
      Object.assign(this, opportunityVolunteer);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: OpportunityVolunteerStatusType,
  })
  @IsEnum(OpportunityVolunteerStatusType)
  status: OpportunityVolunteerStatusType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(
    () => Opportunity,
    (opportunity) => opportunity.opportunityVolunteer,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "opportunity_id" })
  opportunity: Opportunity;

  @Column()
  opportunityId: number;

  @ManyToOne(() => Volunteer, (volunteer) => volunteer.opportunityVolunteer, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "volunteer_id" })
  volunteer: Volunteer;

  @Column()
  volunteerId: number;
}
