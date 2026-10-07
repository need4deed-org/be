import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { In, IsNull } from "typeorm";
import { dataSource } from "../../../data/data-source";
import User from "../../../data/entity/user.entity";
import { getRepository } from "../../../data/utils";
import logger from "../../../logger";
import type { TaggedWhere } from "../../../services/notify/events/email-tagged";

export interface NotifyTaggedByEmailProps {
  personIds: number[];
  author: { userId: number; personId?: number | null; name?: string };
  allowedRoles: UserRole[];
  text: string;
  where: TaggedWhere;
}

export async function notifyTaggedByEmail(
  fastify: FastifyInstance,
  { personIds, author, allowedRoles, text, where }: NotifyTaggedByEmailProps,
): Promise<void> {
  const tagged = [...new Set(personIds)].filter((id) => id !== author.personId);
  if (tagged.length === 0 || allowedRoles.length === 0) {
    return;
  }

  let users: User[];
  try {
    users = await getRepository(dataSource, User).find({
      where: {
        personId: In(tagged),
        role: In(allowedRoles),
        isActive: true,
        deactivatedAt: IsNull(),
      },
      relations: ["person"],
    });
  } catch (error) {
    logger.warn(`notifyTaggedByEmail: recipient lookup failed: ${error}`);
    return;
  }

  const results = await Promise.allSettled(
    users
      .filter((user) => user.id !== author.userId)
      .map((user) =>
        Promise.resolve().then(() =>
          fastify.notify.emailTagged({
            recipient: {
              email: user.email,
              name: user.person?.name,
              language: user.language,
            },
            authorName: author.name,
            text,
            where,
          }),
        ),
      ),
  );
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    const { reason } = failed[0] as PromiseRejectedResult;
    logger.warn(
      `notifyTaggedByEmail: ${failed.length}/${results.length} email(s) failed (author user ${author.userId}): ${reason instanceof Error ? reason.name : typeof reason}`,
    );
  }
}
