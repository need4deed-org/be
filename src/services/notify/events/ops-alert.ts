import { postSlackNotice, type SlackNoticeDeps } from "./slack-notice";

export async function sendOpsAlert(
  deps: SlackNoticeDeps,
  text: string,
): Promise<void> {
  await postSlackNotice(deps, "ops", text);
}
