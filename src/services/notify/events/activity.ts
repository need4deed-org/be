import { postSlackNotice, type SlackNoticeDeps } from "./slack-notice";

export async function sendActivity(
  deps: SlackNoticeDeps,
  text: string,
): Promise<void> {
  await postSlackNotice(deps, "activity", text);
}
