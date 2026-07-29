import { IsNotEmpty, IsString, Length } from "class-validator";
import { OptionTitle } from "need4deed-sdk";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import AgentService from "../m2m/agent-service";

@Entity()
export default class Service {
  constructor(service?: Partial<Service>) {
    if (service) {
      Object.assign(this, service);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;

  @OneToMany(() => AgentService, (agentService) => agentService.service)
  agentService: AgentService[];

  // Populated by getOptionTitleTranslations before serialization — see
  // AgentType.translations for why this differs from Skill/Language's
  // single resolved `translation: string`.
  translations?: OptionTitle;
}
