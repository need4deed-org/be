import type { EmailMessage } from "./types";

// Mirrors fillTemplate()'s placeholder syntax ({{ key }} / {{ key! }}) so a
// leftover unresolved placeholder is caught regardless of whether it was
// marked required. Deliberately does not scan for any other substring (e.g.
// the word "undefined") — that's fillTemplate's job at the source, where it
// can tell an actual nullish variable apart from a user having legitimately
// typed that word into free-text content.
const UNRESOLVED_PLACEHOLDER_RE = /\{\{\s*\w+!?\s*\}\}/;

function isBlank(value: string | undefined): boolean {
  return !value || !value.trim();
}

/** Returns a list of problems with a computed EmailMessage — empty if valid. */
export function validateEmailMessage(msg: EmailMessage): string[] {
  const problems: string[] = [];

  const to = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
  if (isBlank(to)) {
    problems.push('"to" is blank');
  } else if (!to.includes("@")) {
    problems.push(`"to" doesn't look like an email address: "${to}"`);
  }

  if (isBlank(msg.subject)) {
    problems.push("subject is blank");
  } else if (UNRESOLVED_PLACEHOLDER_RE.test(msg.subject)) {
    problems.push(`subject has an unresolved placeholder: "${msg.subject}"`);
  }

  if (isBlank(msg.text) && isBlank(msg.html)) {
    problems.push("neither text nor html body is set");
  }
  if (msg.text !== undefined && UNRESOLVED_PLACEHOLDER_RE.test(msg.text)) {
    problems.push("text has an unresolved placeholder");
  }
  if (msg.html !== undefined && UNRESOLVED_PLACEHOLDER_RE.test(msg.html)) {
    problems.push("html has an unresolved placeholder");
  }

  return problems;
}
