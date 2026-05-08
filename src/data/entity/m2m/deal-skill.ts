import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import Deal from "../deal.entity";
import Skill from "../profile/skill.entity";

@Entity()
export default class DealSkill {
  constructor(dealSkill?: Partial<DealSkill>) {
    if (dealSkill) Object.assign(this, dealSkill);
  }
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(() => Deal, (deal) => deal.dealSkill, { onDelete: "CASCADE" })
  @JoinColumn({ name: "deal_id" }) deal: Deal;
  @Column() dealId: number;
  @ManyToOne(() => Skill, (skill) => skill.profileSkill, { onDelete: "CASCADE" })
  @JoinColumn({ name: "skill_id" }) skill: Skill;
  @Column() skillId: number;
}
