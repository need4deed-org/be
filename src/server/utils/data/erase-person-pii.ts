import { EntityManager } from "typeorm";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Organization from "../../../data/entity/organization.entity";
import Person from "../../../data/entity/person.entity";
import Post from "../../../data/entity/post.entity";
import User from "../../../data/entity/user.entity";

export interface ErasePersonPiiSummary {
  agentRoles: number;
  organizationContact: number;
  communityPosts: number;
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
// Also deactivates any User login tied to this Person — an anonymized
// identity shouldn't still be able to log in as themselves.
export async function erasePersonPii(
  manager: EntityManager,
  personId: number,
): Promise<ErasePersonPiiSummary> {
  const [agentRoles, organizationContact, communityPosts] = await Promise.all([
    manager.count(AgentPerson, { where: { personId } }),
    manager.count(Organization, { where: { personId } }),
    manager.count(Post, { where: { authorId: personId } }),
  ]);

  await manager.update(User, { personId }, { isActive: false });

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

  return { agentRoles, organizationContact, communityPosts };
}
