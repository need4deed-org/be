import logger from "../../../logger";

interface NamedCronJob {
  name: string;
  run: () => Promise<void>;
}

interface RunNamedCronJobsOptions {
  // Run jobs one after another instead of concurrently — for jobs whose
  // queries can match the same rows, so they can't race each other within
  // the same tick (be#987 review). Each job still gets its own try/catch,
  // so one failing doesn't stop the next from running.
  sequential?: boolean;
}

async function runJob(job: NamedCronJob): Promise<void> {
  logger.info(`scheduler: running ${job.name}`);
  await job.run();
  logger.info(`scheduler: ${job.name} completed`);
}

// Runs a batch of cron scan jobs, logging each one's start and completion.
export async function runNamedCronJobs(
  jobs: NamedCronJob[],
  { sequential = false }: RunNamedCronJobsOptions = {},
): Promise<void> {
  if (sequential) {
    for (const job of jobs) {
      try {
        await runJob(job);
      } catch (err) {
        logger.error({ err }, `scheduler: ${job.name} failed`);
      }
    }
    return;
  }

  // Promise.allSettled alone loses which job a rejection came from once
  // you're just holding an array of results, so each job is resolved to
  // its name here before reporting a failure.
  const results = await Promise.allSettled(jobs.map(runJob));

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      logger.error({ err: result.reason }, `scheduler: ${jobs[i].name} failed`);
    }
  });
}
