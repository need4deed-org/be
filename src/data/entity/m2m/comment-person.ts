import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Comment from "../comment.entity";
import Person from "../person.entity";

@Entity()
@Index(["commentId", "personId"], { unique: true })
export default class CommentPerson {
  constructor(commentPerson?: Partial<CommentPerson>) {
    if (commentPerson) {
      Object.assign(this, commentPerson);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Comment, (comment) => comment.commentPerson, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "comment_id" })
  comment: Comment;

  @Column()
  commentId: number;

  @ManyToOne(() => Person, (person) => person.commentPerson, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "person_id" })
  person: Person;

  @Column()
  personId: number;
}
