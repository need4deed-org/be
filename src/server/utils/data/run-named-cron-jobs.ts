import logger from "../../../logger";

interface NamedCronJob {
  name: string;
  run: () => Promise<void>;
}

// Runs a batch of cron scan jobs concurrently, logging each one's start and
// completion. Promise.allSettled alone loses which job a rejection came
// from once you're just holding an array of results, so each job is
// resolved to its name here before reporting a failure.
export async function runNamedCronJobs(jobs: NamedCronJob[]): Promise<void> {
  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      logger.info(`scheduler: running ${job.name}`);
      await job.run();
      logger.info(`scheduler: ${job.name} completed`);
    }),
  );

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      logger.error({ err: result.reason }, `scheduler: ${jobs[i].name} failed`);
    }
  });
}
