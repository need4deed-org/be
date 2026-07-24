import { IsNotEmpty, IsString, Length } from "class-validator";
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

  translation: string;
}
