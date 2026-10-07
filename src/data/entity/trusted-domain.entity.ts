import { IsNotEmpty, IsString } from "class-validator";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class TrustedDomain {
  constructor(trustedDomain?: Partial<TrustedDomain>) {
    if (trustedDomain) {
      Object.assign(this, trustedDomain);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  @IsNotEmpty()
  @IsString()
  domain: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}
