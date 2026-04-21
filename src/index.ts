import cron from 'node-cron';
import express from 'express';
import { Server } from 'node:http';
import mongoose from 'mongoose';
import { connect, disconnect, upsertDrawResult } from './db';
import { fetchLatestResult } from './fetchLatest';

const CRON_EXPRESSION = process.env.CRON_EXPRESSION ?? '12 5,10,15,20,25,30,35,40,45,50,55,0 * * * *';
const HEALTH_PORT = Number(process.env.HEALTH_PORT ?? process.env.PORT ?? 3010);
const HEALTH_HOST = process.env.HOST ?? '0.0.0.0';

let isRunning = false;
let healthServer: Server | null = null;
let isShuttingDown = false;

function getMongoStatus(): 'disconnected' | 'connected' | 'connecting' | 'disconnecting' {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}

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
    // 增加一个北京时间
    const bjTime = formatTimestamp();
    console.log(
      `[fetch] Issue: ${data.issue} | DrawCode: ${data.draw_code} | DrawTime: ${data.draw_time} | BJTime: ${bjTime}`,
    );

    // const isNew = await upsertDrawResult(data);

    // if (isNew) {
    //   console.log(`[db] New record saved — PeriodNo: ${data.issue}`);
    // } else {
    //   console.log(`[db] Record already exists, skipped — PeriodNo: ${data.issue}`);
    // }
  } catch (err) {
    console.error(`[job] Failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    const elapsed = Date.now() - startTime;
    // console.log(`[job] Finished in ${elapsed}ms`);
    isRunning = false;
  }
}

async function bootstrap(): Promise<void> {
  try {
    await connect();
  } catch (err) {
    console.error(`[bootstrap] Failed to connect to MongoDB: ${err instanceof Error ? err.message : String(err)}`);
  }
  

  const app = express();
  app.get('/health', (_req, res) => {
    const mongoStatus = getMongoStatus();

    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      mongo: mongoStatus,
    });
  });

  await new Promise<void>((resolve, reject) => {
    healthServer = app.listen(HEALTH_PORT, HEALTH_HOST, () => {
      console.log(`[health] Listening on http://${HEALTH_HOST}:${HEALTH_PORT}/health`);
      resolve();
    });
    healthServer.on('error', reject);
  });

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

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[signal] ${signal} received, shutting down`);

  if (healthServer) {
    await new Promise<void>((resolve, reject) => {
      healthServer?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await disconnect();
  process.exit(0);
}

/**
 * 格式化时间戳为可读时间
 */
function formatTimestamp(timestamp: number = Date.now()): string {
  return new Date(timestamp).toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
  });
}

void bootstrap().catch(async (err) => {
  console.error(`[bootstrap] ${err instanceof Error ? err.message : String(err)}`);
  await disconnect();
  process.exit(1);
});

process.on('SIGINT', async () => {
  await shutdown('SIGINT');
});

process.on('SIGTERM', async () => {
  await shutdown('SIGTERM');
});
