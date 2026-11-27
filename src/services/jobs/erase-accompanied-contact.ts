import { FastifyInstance } from "fastify";
import { berlinToday, OpportunityType } from "need4deed-sdk";
import logger from "../../logger";
import { berlinDayBoundaries, monthsAgo } from "./berlin-dates";

export async function eraseAccompaniedContact(
  fastify: FastifyInstance,
  today: Date = berlinToday(),
): Promise<void> {
  const cutoff = berlinDayBoundaries(monthsAgo(1, today)).startOfDay;
  const [, erased]: [unknown, number] =
    await fastify.db.accompanyingRepository.query(
      `UPDATE accompanying a
          SET name = '', phone = NULL
         FROM opportunity o
         JOIN onetimer t ON t.id = o.onetimer_id
        WHERE o.accompanying_id = a.id
          AND o.type = $1
          AND t.date < $2
          AND (a.name <> '' OR a.phone IS NOT NULL)`,
      [OpportunityType.ACCOMPANYING, cutoff],
    );
  logger.info(
    `scheduler: erased name and phone of ${erased} accompanied persons`,
  );
}
