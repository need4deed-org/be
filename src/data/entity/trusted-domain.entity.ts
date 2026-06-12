import { IsNotEmpty, IsString } from "class-validator";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// Email-domain allowlist for agent self-registration: a registrant whose email
// domain is here is treated as a known RAC org, so a brand-new representative
// (whose org has no member yet) can still register and the join auto-approves
// to ACTIVE. Stored lowercase; managed via the /trusted-domain CRUD.
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
