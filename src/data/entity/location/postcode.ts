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

  @Column()
  @IsNotEmpty()
  @IsPostcode(Country.DE, [GermanCity.BERLIN, GermanCity.POTSDAM])
  value: string;
}
