import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Agent from "../opportunity/agent.entity";
import Language from "../profile/language.entity";

@Entity()
export default class AgentLanguage {
  constructor(agentLanguage?: Partial<AgentLanguage>) {
    if (agentLanguage) {
      Object.assign(this, agentLanguage);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Agent, (profile) => profile.agentLanguage, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "agent_id" })
  agent: Agent;

  @Column()
  agentId: number;

  @ManyToOne(() => Language, (language) => language.agentLanguage, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "language_id" })
  language: Language;

  @Column()
  languageId: number;
}
