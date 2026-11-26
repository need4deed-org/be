import { ApiOpportunityFeedbackGet } from "need4deed-sdk";
import OpportunityFeedback from "../../data/entity/opportunity/opportunity-feedback.entity";
import { UNKNOWN_AUTHOR } from "./dto-comment";

export function dtoOpportunityFeedback(
  feedback: OpportunityFeedback,
): ApiOpportunityFeedbackGet {
  return {
    id: feedback.id,
    opportunityId: feedback.opportunityId,
    authorUserId: feedback.authorUserId,
    authorName: feedback.authorUser.person?.name || UNKNOWN_AUTHOR,
    authorRole: feedback.authorUser.role,
    text: feedback.text,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
}
