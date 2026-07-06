import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import Agent from "./opportunity/agent.entity";
import Opportunity from "./opportunity/opportunity.entity";
import Person from "./person.entity";

@Entity()
export default class Post {
  constructor(post?: Partial<Post>) {
    if (post) {
      Object.assign(this, post);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  text: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "author_id" })
  author: Person;

  @Column()
  authorId: number;

  @ManyToOne(() => Agent, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "agent_id" })
  agent: Agent | null;

  @Column({ nullable: true })
  agentId: number | null;

  @ManyToMany(() => Person)
  @JoinTable({
    name: "post_tagged_person",
    joinColumn: { name: "post_id" },
    inverseJoinColumn: { name: "person_id" },
  })
  taggedPersons: Person[];

  @ManyToMany(() => Opportunity)
  @JoinTable({
    name: "post_linked_opportunity",
    joinColumn: { name: "post_id" },
    inverseJoinColumn: { name: "opportunity_id" },
  })
  linkedOpportunities: Opportunity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
