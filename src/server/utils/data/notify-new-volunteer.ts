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
