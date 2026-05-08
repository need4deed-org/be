import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import Activity from "../profile/activity.entity";
import Deal from "../deal.entity";

@Entity()
export default class DealActivity {
  constructor(dealActivity?: Partial<DealActivity>) {
    if (dealActivity) Object.assign(this, dealActivity);
  }
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(() => Deal, (deal) => deal.dealActivity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "deal_id" }) deal: Deal;
  @Column() dealId: number;
  @ManyToOne(() => Activity, (activity) => activity.profileActivity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "activity_id" }) activity: Activity;
  @Column() activityId: number;
}
