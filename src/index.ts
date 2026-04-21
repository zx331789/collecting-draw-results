import 'dotenv/config';
import cron from 'node-cron';
import { connect, disconnect, upsertDrawResult } from './db';
import { fetchLatestResult } from './fetchLatest';

const CRON_EXPRESSION = process.env.CRON_EXPRESSION ?? '12 5,10,15,20,25,30,35,40,45,50,55,0 * * * *';

let isRunning = false;

async function runJob(): Promise<void> {
  if (isRunning) {
    console.warn('[job] Previous run still in progress, skipping this tick');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    const response = await fetchLatestResult();
    const { data } = response;

    console.log(
      `[fetch] Issue: ${data.issue} | DrawCode: ${data.draw_code} | DrawTime: ${data.draw_time}`,
    );

    const isNew = await upsertDrawResult(data);

    if (isNew) {
      console.log(`[db] New record saved — PeriodNo: ${data.issue}`);
    } else {
      console.log(`[db] Record already exists, skipped — PeriodNo: ${data.issue}`);
    }
  } catch (err) {
    console.error(`[job] Failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    const elapsed = Date.now() - startTime;
    console.log(`[job] Finished in ${elapsed}ms`);
    isRunning = false;
  }
}

async function bootstrap(): Promise<void> {
  await connect();

  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`Invalid CRON_EXPRESSION: ${CRON_EXPRESSION}`);
  }

  // 启动时先执行一次，避免必须等到下一个调度点。
  await runJob();

  cron.schedule(CRON_EXPRESSION, () => {
    void runJob();
  });

  console.log(`[cron] Scheduler started: "${CRON_EXPRESSION}"`);
}

void bootstrap().catch(async (err) => {
  console.error(`[bootstrap] ${err instanceof Error ? err.message : String(err)}`);
  await disconnect();
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('[signal] SIGINT received, shutting down');
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[signal] SIGTERM received, shutting down');
  await disconnect();
  process.exit(0);
});
