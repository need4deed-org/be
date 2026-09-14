import { EntityManager } from "typeorm";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Organization from "../../../data/entity/organization.entity";
import Person from "../../../data/entity/person.entity";
import Post from "../../../data/entity/post.entity";
import Testimonial from "../../../data/entity/testimonial.entity";
import User from "../../../data/entity/user.entity";

export interface ErasePersonPiiSummary {
  agentRoles: number;
  organizationContact: number;
  communityPosts: number;
  testimonials: number;
  opportunitySubmitterOrContact: number;
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
// Two things beyond Person's own columns need explicit handling:
// - User: deactivated (isActive: false) so the anonymized identity can't log
//   in, AND its email replaced (NOT NULL + unique, so it can't simply be
//   nulled) — the login email is itself identifying PII and would otherwise
//   survive the erasure untouched.
// - Testimonial: has its own denormalized `name`/`pic` columns (not derived
//   from Person), so anonymizing Person alone leaves a testimonial still
//   displaying the person's real name/photo — these are nulled too.
//
// Organization/AgentPerson/Post/Opportunity.submittedBy&contactPerson carry
// no PII of their own beyond the live `person`/`author` relation, so once
// Person's fields are anonymized, reading through that relation already
// shows the anonymized identity — they only need counting, for the caller
// to warn that this Person's other roles are affected too.
export async function erasePersonPii(
  manager: EntityManager,
  personId: number,
): Promise<ErasePersonPiiSummary> {
  const [
    agentRoles,
    organizationContact,
    communityPosts,
    testimonials,
    opportunitySubmitterOrContact,
  ] = await Promise.all([
    manager.count(AgentPerson, { where: { personId } }),
    manager.count(Organization, { where: { personId } }),
    manager.count(Post, { where: { authorId: personId } }),
    manager.count(Testimonial, { where: { personId } }),
    manager.count(Opportunity, {
      where: [{ submittedByPersonId: personId }, { contactPersonId: personId }],
    }),
  ]);

  const users = await manager.find(User, { where: { personId } });
  await Promise.all(
    users.map((user) =>
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

  if (testimonials > 0) {
    await manager.update(Testimonial, { personId }, { name: null, pic: null });
  }

  await manager.update(
    Person,
    { id: personId },
    {
      // firstName is NOT NULL — "[deleted]" per the issue's own suggested
      // convention, rather than an empty string that could read as a person
      // who genuinely has no first name.
      firstName: "[deleted]",
      middleName: null,
      lastName: null,
      email: null,
      phone: null,
      landline: null,
      avatarUrl: null,
      // Detach rather than mutate the Address row itself — it may be shared
      // (e.g. by an Organization or Agent at the same physical address), so
      // blanking its own street/city in place would leak into whoever else
      // points at that same row.
      addressId: null,
    },
  );

  return {
    agentRoles,
    organizationContact,
    communityPosts,
    testimonials,
    opportunitySubmitterOrContact,
  };
}
