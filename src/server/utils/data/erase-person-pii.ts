import { UserRole } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import CommentPerson from "../../../data/entity/m2m/comment-person";
import PostBookmark from "../../../data/entity/m2m/post-bookmark";
import PostReaction from "../../../data/entity/m2m/post-reaction";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Organization from "../../../data/entity/organization.entity";
import Person from "../../../data/entity/person.entity";
import Post from "../../../data/entity/post.entity";
import Testimonial from "../../../data/entity/testimonial.entity";
import User from "../../../data/entity/user.entity";
import { PERSON_PII_FIELDS } from "../pii/mask";

const OTHER_ROLE_CHECKS = [
  {
    key: "agentRoles",
    label: "agent-membership record(s)",
    count: (manager: EntityManager, personId: number) =>
      manager.count(AgentPerson, { where: { personId } }),
  },
  {
    key: "organizationContact",
    label: "organization contact record(s)",
    count: (manager: EntityManager, personId: number) =>
      manager.count(Organization, { where: { personId } }),
  },
  {
    key: "communityPosts",
    label: "community post(s)",
    count: (manager: EntityManager, personId: number) =>
      manager.count(Post, { where: { authorId: personId } }),
  },
  {
    key: "testimonials",
    label: "testimonial(s) (also anonymized)",
    count: (manager: EntityManager, personId: number) =>
      manager.count(Testimonial, { where: { personId } }),
  },
  {
    key: "opportunitySubmitterOrContact",
    label: "opportunity submission(s)/contact record(s)",
    count: (manager: EntityManager, personId: number) =>
      manager.count(Opportunity, {
        where: [
          { submittedByPersonId: personId },
          { contactPersonId: personId },
        ],
      }),
  },
  {
    key: "commentMentions",
    label: "internal comment mention(s)",
    count: (manager: EntityManager, personId: number) =>
      manager.count(CommentPerson, { where: { personId } }),
  },
  {
    key: "postTags",
    label: "community post tag(s)",
    count: async (manager: EntityManager, personId: number) => {
      const [{ count }] = await manager.query(
        "SELECT COUNT(*)::int AS count FROM post_person WHERE person_id = $1",
        [personId],
      );
      return count as number;
    },
  },
  {
    key: "postReactions",
    label: "post reaction(s)",
    count: (manager: EntityManager, personId: number) =>
      manager.count(PostReaction, { where: { personId } }),
  },
  {
    key: "postBookmarks",
    label: "post bookmark(s)",
    count: (manager: EntityManager, personId: number) =>
      manager.count(PostBookmark, { where: { personId } }),
  },
] as const;

export type ErasePersonPiiSummary = {
  [K in (typeof OTHER_ROLE_CHECKS)[number]["key"]]: number;
};

export function describeOtherRoles(summary: ErasePersonPiiSummary): string[] {
  return OTHER_ROLE_CHECKS.filter((check) => summary[check.key] > 0).map(
    (check) => `${summary[check.key]} ${check.label}`,
  );
}

export function buildEraseSummaryMessage(
  deletedDescription: string,
  eraseSummary: ErasePersonPiiSummary | undefined,
): string {
  if (!eraseSummary) {
    return `${deletedDescription} deleted.`;
  }
  const otherRoles = describeOtherRoles(eraseSummary);
  const base = `${deletedDescription} deleted; this person's PII was anonymized.`;
  return otherRoles.length
    ? `${base} Note: this person also has ${otherRoles.join(", ")} — those records now show an anonymized identity too.`
    : base;
}

export async function erasePersonPii(
  manager: EntityManager,
  personId: number,
): Promise<ErasePersonPiiSummary> {
  const counts = await Promise.all(
    OTHER_ROLE_CHECKS.map((check) => check.count(manager, personId)),
  );
  const summary = Object.fromEntries(
    OTHER_ROLE_CHECKS.map((check, i) => [check.key, counts[i]]),
  ) as ErasePersonPiiSummary;

  const volunteerLogins = await manager.find(User, {
    where: { personId, role: UserRole.VOLUNTEER },
    select: ["id"],
  });
  await Promise.all(
    volunteerLogins.map((user) =>
      manager.update(
        User,
        { id: user.id },
        {
          isActive: false,
          deactivatedAt: new Date(),
          email: `deleted-user-${user.id}@erased.need4deed.org`,
        },
      ),
    ),
  );

  if (summary.testimonials > 0) {
    await manager.update(
      Testimonial,
      { personId },
      { name: null, pic: null, isActive: false },
    );
  }

  await manager.update(
    Person,
    { id: personId },
    {
      ...Object.fromEntries(
        PERSON_PII_FIELDS.map((field) => [
          field,
          field === "firstName" ? "[deleted]" : null,
        ]),
      ),
      addressId: null,
    },
  );

  return summary;
}
