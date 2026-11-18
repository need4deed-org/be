const AGENT_TOKEN = /<@agent:(\d+)>/g;
const MAX_INT4 = 2147483647;

export function getTaggedAgentIds(text: string): number[] {
  return [
    ...new Set(
      [...text.matchAll(AGENT_TOKEN)]
        .map((m) => Number(m[1]))
        .filter((id) => id <= MAX_INT4),
    ),
  ];
}
