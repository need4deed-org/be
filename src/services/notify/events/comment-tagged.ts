import logger from "../../../logger";
import type { SlackTransport } from "../types";

export interface CommentTaggedDeps {
  slack?: SlackTransport;
}

export interface CommentTaggedInput {
  authorName: string;
  taggedNames: string[];
  text: string;
}

export async function sendCommentTagged(
  { slack }: CommentTaggedDeps,
  { authorName, taggedNames, text }: CommentTaggedInput,
): Promise<void> {
  if (!slack) {
    return;
  }
  const tagged = taggedNames.length > 0 ? taggedNames.join(", ") : "someone";
  const message = `🏷️ *${authorName}* tagged ${tagged} in a comment:\n> ${text}`;
  try {
    await slack.send({ channel: "comments", text: message });
  } catch (err) {
    logger.warn(
      `commentTagged slack notification failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}
