import { ApiPostReactionSummary } from "need4deed-sdk";
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import Agent from "./opportunity/agent.entity";
import Opportunity from "./opportunity/opportunity.entity";
import Person from "./person.entity";

@Entity()
@Check(`("parent_id" IS NULL) = ("root_id" IS NULL)`)
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
    name: "post_person",
    joinColumn: { name: "post_id" },
    inverseJoinColumn: { name: "person_id" },
  })
  taggedPersons: Person[];

  @ManyToMany(() => Opportunity)
  @JoinTable({
    name: "post_opportunity",
    joinColumn: { name: "post_id" },
    inverseJoinColumn: { name: "opportunity_id" },
  })
  linkedOpportunities: Opportunity[];

  @ManyToOne(() => Post, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "parent_id" })
  parent: Post | null;

  @Index()
  @Column({ nullable: true })
  parentId: number | null;

  @ManyToOne(() => Post, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "root_id" })
  root: Post | null;

  @Index()
  @Column({ nullable: true })
  rootId: number | null;

  @OneToMany(() => Post, (post) => post.root)
  descendantReplies: Post[];

  replyCount?: number;

  reactions?: ApiPostReactionSummary[];
  myReaction?: string | null;

  bookmarked?: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
