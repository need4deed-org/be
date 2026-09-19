import { FastifyInstance } from "fastify";
import logger from "../../../logger";
import { getVolunteerNotificationText } from "../common";
import { getVolunteerClones } from "./get-volunteer-clones";

export interface NotifyNewVolunteerProps {
  id: number;
  email?: string | null;
  phone?: string | null;
  name: string;
}

// Fire-and-forget: runs after the volunteer has already been committed, so a
// transient failure here (DB blip on the clone lookup, Slack outage) must
// never turn a successful registration into a 500 for the caller.
export function notifyNewVolunteer(
  fastify: FastifyInstance,
  { id, email, phone, name }: NotifyNewVolunteerProps,
): void {
  getVolunteerClones({ id, email, phone })
    .then((volunteerCloneIds) => {
      fastify.notify.opsAlert(
        getVolunteerNotificationText(
          email || "No email",
          name,
          volunteerCloneIds,
        ),
      );
    })
    .catch((error) => {
      logger.warn(`Volunteer clone lookup/notify failed: ${error}`);
    });
}
