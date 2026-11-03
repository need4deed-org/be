import { postSlackNotice, type SlackNoticeDeps } from "./slack-notice";

export async function sendArrival(
  deps: SlackNoticeDeps,
  text: string,
): Promise<void> {
  await postSlackNotice(deps, "arrivals", text);
}
