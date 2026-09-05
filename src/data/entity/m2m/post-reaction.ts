import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Person from "../person.entity";
import Post from "../post.entity";

@Entity()
@Index(["postId", "personId"], { unique: true })
export default class PostReaction {
  constructor(reaction?: Partial<PostReaction>) {
    if (reaction) {
      Object.assign(this, reaction);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Post, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post: Post;

  @Column()
  postId: number;

  @ManyToOne(() => Person, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "person_id" })
  person: Person;

  @Column()
  personId: number;

  @Column({ type: "text" })
  emoji: string;

  @CreateDateColumn()
  createdAt: Date;
}
