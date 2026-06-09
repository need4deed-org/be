import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import Deal from "../deal.entity";
import District from "../location/district.entity";

@Entity()
@Unique(["dealId", "districtId"])
export default class DealDistrict {
  constructor(dealDistrict?: Partial<DealDistrict>) {
    if (dealDistrict) {
      Object.assign(this, dealDistrict);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Deal, (deal) => deal.dealDistrict, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "deal_id" })
  deal: Deal;

  @Column()
  dealId: number;

  @ManyToOne(() => District, (district) => district.dealDistrict, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "district_id" })
  district: District;

  @Column()
  districtId: number;
}
