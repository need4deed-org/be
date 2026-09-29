import logger from "../../../logger";
import type { SlackTransport } from "../types";

export interface TaggedDeps {
  slack?: SlackTransport;
}

export interface TaggedInput {
  // Where the tags are — posts share the comments channel (be#1075).
  kind: "comment" | "post";
  authorName: string;
  taggedNames: string[];
  text: string;
}

const KIND_LABEL: Record<TaggedInput["kind"], string> = {
  comment: "a comment",
  post: "a post",
};

export async function sendTagged(
  { slack }: TaggedDeps,
  { kind, authorName, taggedNames, text }: TaggedInput,
): Promise<void> {
  if (!slack) {
    return;
  }
  const tagged = taggedNames.length > 0 ? taggedNames.join(", ") : "someone";
  const message = `🏷️ *${authorName}* tagged ${tagged} in ${KIND_LABEL[kind]}:\n> ${text}`;
  try {
    await slack.send({ channel: "comments", text: message });
  } catch (err) {
    logger.warn(
      `tagged (${kind}) slack notification failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}
