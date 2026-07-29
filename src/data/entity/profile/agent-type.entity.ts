import { IsNotEmpty, IsString, Length } from "class-validator";
import { OptionTitle } from "need4deed-sdk";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import Agent from "../opportunity/agent.entity";

@Entity()
export default class AgentType {
  constructor(agentType?: Partial<AgentType>) {
    if (agentType) {
      Object.assign(this, agentType);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;

  @OneToMany(() => Agent, (agent) => agent.agentType)
  agent: Agent[];

  // Populated by getOptionTitleTranslations before serialization — unlike
  // Skill/Language's single resolved `translation: string`, this needs both
  // en and de at once to match the OptionById.title shape in a single response.
  translations?: OptionTitle;
}
