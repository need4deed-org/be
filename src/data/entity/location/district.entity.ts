import { IsNotEmpty, IsString, Length } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import LocationDistrict from "../m2m/location-district";

@Entity()
export default class District {
  constructor(district?: Partial<District>) {
    if (district) {
      Object.assign(this, district);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;

  @OneToMany(
    () => LocationDistrict,
    (locationDistrict) => locationDistrict.district,
  )
  locationDistrict: LocationDistrict[];
}
