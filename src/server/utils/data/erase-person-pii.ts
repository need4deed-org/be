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

// Every other role/record a Person can be tied to, beyond the Volunteer
// profile being deleted. None of these carry PII of their own beyond a live
// `person`/`author` relation (Organization.email/phone are a documented
// exception — see the comment on erasePersonPii), so once Person's own
// fields are anonymized, reading through the relation already shows the
// anonymized identity: these only need counting, so the caller can warn
// that the erased person's other roles are affected too. One entry here
// drives both the summary object erasePersonPii returns and the human-
// readable warning list describeOtherRoles builds from it — adding a new
// tracked role only ever means adding one entry, not four.
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
      // Post.taggedPersons is a plain @ManyToMany with no dedicated entity
      // for its post_person join table, so there's no repository to
      // .count() against — a raw count on the join table itself instead.
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

// Turns an erasePersonPii() summary into human-readable "N thing(s)" phrases
// for the ones that are actually nonzero.
export function describeOtherRoles(summary: ErasePersonPiiSummary): string[] {
  return OTHER_ROLE_CHECKS.filter((check) => summary[check.key] > 0).map(
    (check) => `${summary[check.key]} ${check.label}`,
  );
}

// GDPR Art. 17 erasure (be#727): anonymizes a Person's PII in place rather
// than hard-deleting the row. A Person can simultaneously be a volunteer, an
// agent representative, an organization contact, and a community-board
// author — hard-deleting would either cascade-destroy those unrelated roles
// (Organization/AgentPerson/Post all CASCADE off Person) or fail outright
// (Volunteer/User/Testimonial/Opportunity.submittedBy/contactPerson all
// RESTRICT it). Anonymizing avoids both: every FK stays valid, and every
// role tied to this Person becomes untraceable to their real identity.
//
// Two things beyond Person's own columns get explicit handling:
// - User: a VOLUNTEER-role login is deactivated (isActive: false) and its
//   email replaced (NOT NULL + unique, so it can't simply be nulled) — the
//   login email is itself identifying PII. Scoped to role: VOLUNTEER only —
//   User.personId has no uniqueness constraint (POST /user's person.id path
//   never checks for an existing login), so the same Person could also hold
//   an unrelated AGENT/COORDINATOR account; erasing a volunteer profile must
//   not silently deactivate a staff login that has nothing to do with it.
// - Testimonial: has its own denormalized `name`/`pic` columns (not derived
//   from Person), so anonymizing Person alone would leave a testimonial
//   still displaying the person's real name/photo — nulled here too, along
//   with isActive: false so an anonymized testimonial doesn't keep rendering
//   as a live, now-nameless card on a public page.
//
// Known, deliberately-unhandled gap: Organization has its own `email`/
// `phone` columns (not derived from Person). If those happen to duplicate
// this Person's own contact details (plausible when they're an org's sole
// registered contact), they survive this erasure untouched — unlike
// Testimonial's name/pic, Organization's contact fields may be genuinely
// org-level (shared, still in active use by other staff), so blanking them
// automatically risks breaking a working contact channel. Flagged via the
// organizationContact count in the response; needs manual review.
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
          // Same reasoning as firstName below: NOT NULL + unique, so it must
          // become a non-identifying-but-valid value, not null/empty.
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
      // firstName is NOT NULL — "[deleted]" per the issue's own suggested
      // convention, rather than an empty string that could read as a person
      // who genuinely has no first name.
      ...Object.fromEntries(
        PERSON_PII_FIELDS.map((field) => [
          field,
          field === "firstName" ? "[deleted]" : null,
        ]),
      ),
      // Detach rather than mutate the Address row itself — it may be shared
      // (e.g. by an Organization or Agent at the same physical address), so
      // blanking its own street/city in place would leak into whoever else
      // points at that same row.
      addressId: null,
    },
  );

  return summary;
}
