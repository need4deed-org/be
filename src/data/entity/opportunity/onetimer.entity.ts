import { IsDate } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import Opportunity from "./opportunity.entity";

@Entity()
export default class Onetimer {
  constructor(onetimer?: Partial<Onetimer>) {
    if (onetimer) {
      Object.assign(this, onetimer);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "timestamptz" })
  @IsDate()
  date: Date;

  @OneToMany(() => Opportunity, (opportunity) => opportunity.onetimer)
  opportunity: Opportunity[];
}
