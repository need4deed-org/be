import { postSlackNotice, type SlackNoticeDeps } from "./slack-notice";

export interface TaggedInput {
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
  deps: SlackNoticeDeps,
  { kind, authorName, taggedNames, text }: TaggedInput,
): Promise<void> {
  const tagged = taggedNames.length > 0 ? taggedNames.join(", ") : "someone";
  await postSlackNotice(
    deps,
    "activity",
    `🏷️ *${authorName}* tagged ${tagged} in ${KIND_LABEL[kind]}:\n> ${text}`,
  );
}
