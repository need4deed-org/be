import { EntityTableName, OpportunityLegacyFormData } from "need4deed-sdk";
import { DataSource, EntityManager } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import User from "../../../data/entity/user.entity";
import { getRepository } from "../../../data/utils";
import logger from "../../../logger";

type ContactFields = Pick<
  OpportunityLegacyFormData,
  "rac_email" | "rac_full_name" | "rac_phone" | "rac_address" | "rac_plz"
>;

export async function writeOpportunityContactComment(
  opportunityId: number,
  agentId: number | undefined,
  body: ContactFields,
  manager: DataSource | EntityManager = dataSource,
): Promise<void> {
  const { rac_email, rac_full_name, rac_phone, rac_address, rac_plz } = body;
  if (!rac_email && !rac_full_name && !rac_phone) {
    return;
  }

  try {
    const userRepository = getRepository(manager, User);

    let author: User | null = null;
    if (agentId) {
      const link = await getRepository(manager, AgentPerson).findOne({
        where: { agentId },
      });
      if (link) {
        author = await userRepository.findOne({
          where: { personId: link.personId },
        });
      }
    }
    if (!author) {
      author = await userRepository.findOne({
        where: {},
        order: { id: "ASC" },
      });
    }
    if (!author) {
      logger.warn(
        `No user available to author contact comment for opportunity ${opportunityId}`,
      );
      return;
    }

    const text = `${rac_email ?? ""}<|>${rac_full_name ?? ""}<|>${rac_address ?? ""}<|>${rac_plz ?? ""}<|>${rac_phone ?? ""}`;
    const commentRepository = getRepository(manager, Comment);
    await commentRepository.save(
      commentRepository.create({
        text,
        entityType: EntityTableName.OPPORTUNITY,
        entityId: opportunityId,
        userId: author.id,
      }),
    );
  } catch (err) {
    logger.error(
      `Failed to write contact backup comment for opportunity ${opportunityId}: ${err instanceof Error ? err.message : err}`,
    );
  }
}
