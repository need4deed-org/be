import { IsNotEmpty } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { IsPostcode } from "../../../services/validators/custom";
import { Country, GermanCity } from "../../types";

@Entity()
export default class Postcode {
  constructor(postcode?: Partial<Postcode>) {
    if (postcode) {
      Object.assign(this, postcode);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "numeric", precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ type: "numeric", precision: 9, scale: 7, nullable: true })
  latitude?: number;

  @Column()
  @IsNotEmpty()
  @IsPostcode(Country.DE, [GermanCity.BERLIN, GermanCity.POTSDAM])
  value: string;
}
