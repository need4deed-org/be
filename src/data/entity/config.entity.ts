import { IsEnum } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ConfigType } from "../types";

@Entity()
export default class Config {
  constructor(config?: Partial<Config>) {
    if (config) {
      Object.assign(this, config);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: ConfigType })
  @IsEnum(ConfigType)
  configKey: ConfigType;

  @Column()
  configValue: number;
}
