import mongoose from 'mongoose';
import { DrawResult } from './types';
import { LotteryDraw } from './models/LotteryDraw';

/**
 * 建立 Mongoose 连接（幂等：已连接则直接复用）。
 */
export async function connect(): Promise<void> {
  if (mongoose.connection.readyState !== 0) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  await mongoose.connect(uri);
  console.log(`[db] Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

/**
 * 将一条开奖记录写入 lottery_draws 集合，若该期号已存在则跳过（幂等写入）。
 *
 * API 字段映射：
 *   issue    (string) → PeriodNo (number)
 *   openCode (string，逗号分隔) → numbers (number[])
 *   openTime (string) → drawTime (string)
 *
 * @returns 是否为新插入（true = 新记录，false = 该期号已存在）
 */
export async function upsertDrawResult(result: DrawResult): Promise<boolean> {
  const periodNo = parseInt(result.issue, 10);
  if (isNaN(periodNo)) {
    throw new Error(`Invalid issue format, cannot parse to number: "${result.issue}"`);
  }

  const numbers = result.draw_code
    .split(',')
    .map((n) => parseInt(n.trim(), 10));

  const res = await LotteryDraw.updateOne(
    { PeriodNo: periodNo },
    { $setOnInsert: { PeriodNo: periodNo, numbers, drawTime: result.draw_time } },
    { upsert: true },
  );

  return res.upsertedCount > 0;
}

/**
 * 断开 Mongoose 连接（进程退出前调用）。
 */
export async function disconnect(): Promise<void> {
  await mongoose.disconnect();
  console.log('[db] Disconnected from MongoDB');
}
