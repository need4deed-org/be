import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { DocumentType } from "need4deed-sdk";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import Volunteer from "./volunteer/volunteer.entity";

@Entity()
@Unique(["type", "volunteer"])
export default class Document {
  constructor(document?: Partial<Document>) {
    if (document) {
      Object.assign(this, document);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: DocumentType,
  })
  @IsEnum(DocumentType, {
    message: "Type must be one of: CGC, CGC_APPLICATION, or PASSPORT_ID",
  })
  @IsNotEmpty()
  type: DocumentType;

  @Column()
  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ManyToOne(() => Volunteer, (volunteer) => volunteer.documents, {
    onDelete: "CASCADE",
  })
  @IsNotEmpty()
  volunteer: Volunteer;

  @Column({ nullable: true })
  volunteerId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
