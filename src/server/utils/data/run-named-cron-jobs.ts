import logger from "../../../logger";

interface NamedCronJob {
  name: string;
  run: () => Promise<void>;
}

interface RunNamedCronJobsOptions {
  sequential?: boolean;
}

async function runJob(job: NamedCronJob): Promise<void> {
  logger.info(`scheduler: running ${job.name}`);
  await job.run();
  logger.info(`scheduler: ${job.name} completed`);
}

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

  const results = await Promise.allSettled(jobs.map(runJob));

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      logger.error({ err: result.reason }, `scheduler: ${jobs[i].name} failed`);
    }
  });
}
