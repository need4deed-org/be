import { ApiAppreciationGet } from "need4deed-sdk";
import Appreciation from "../../data/entity/volunteer/appreciation.entity";

export function dtoAppreciation(
  appreciation: Appreciation,
): ApiAppreciationGet {
  return {
    id: appreciation.id,
    title: appreciation.title,
    status: appreciation.status,
    dateDue: appreciation?.dateDue,
    dateDelivery: appreciation?.dateDelivery,
    volunteerId: appreciation.volunteerId,
    opportunityId: appreciation?.opportunityId,
    userId: appreciation?.userId,
  };
}
