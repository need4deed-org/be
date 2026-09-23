import {
  emailFromNotify,
  emailFromVolunteer,
  emailRegistrationManifestUrl,
} from "../../../config/constants";
import { REGISTRATION_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailRegistrationManifestUrl);

export function resetRegistrationTemplateCache(): void {
  loader.resetCache();
}

export interface RegistrationEmailRecipient {
  email: string;
  name: string;
}

// Sent right after a volunteer completes self-registration (fe's "become a
// volunteer" form) — confirms receipt and sets expectations for the
// follow-up call, distinct from the earlier email-verification step.
export async function sendEmailRegistration(
  email: EmailTransport,
  volunteer: RegistrationEmailRecipient,
): Promise<void> {
  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    volunteerName: volunteer.name,
  });

  await email.send({
    to: volunteer.email,
    cc: emailFromVolunteer,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
