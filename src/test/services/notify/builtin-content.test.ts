import { Lang } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import * as builtins from "../../../services/notify/builtin-content";
import type { LocaleContent } from "../../../services/notify/email-template";

// Every {{ key.xx }} in a builtin must name a real language — the builtin is
// what renderEmail() falls back to, so it can't itself be unresolvable
// (be#1075).
const LANG_PLACEHOLDER_RE = /\{\{\s*\w+\.(\w+)\s*\}\}/g;

function bodies(content: LocaleContent): string[] {
  return [content.subject, content.text ?? "", content.html ?? ""];
}

describe("builtin-content", () => {
  const entries = Object.entries(builtins).flatMap(([name, value]) =>
    "subject" in value
      ? [[name, value as LocaleContent] as const]
      : Object.entries(value as Record<Lang, LocaleContent>).map(
          ([lang, content]) => [`${name}.${lang}`, content] as const,
        ),
  );

  it.each(entries)("%s uses only known languages in placeholders", (_, c) => {
    const langs = bodies(c).flatMap((body) =>
      [...body.matchAll(LANG_PLACEHOLDER_RE)].map((m) => m[1]),
    );
    for (const lang of langs) {
      expect(Object.values(Lang)).toContain(lang);
    }
  });
});
