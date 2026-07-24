import { IsNotEmpty, IsString, Length } from "class-validator";
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

  translation: string;
}
