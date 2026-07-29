import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import Agent from "../opportunity/agent.entity";
import Service from "../profile/service.entity";

@Entity()
@Unique(["agentId", "serviceId"])
export default class AgentService {
  constructor(agentService?: Partial<AgentService>) {
    if (agentService) {
      Object.assign(this, agentService);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Agent, (agent) => agent.agentService, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "agent_id" })
  agent: Agent;

  @Column()
  agentId: number;

  @ManyToOne(() => Service, (service) => service.agentService, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "service_id" })
  service: Service;

  @Column()
  serviceId: number;
}
