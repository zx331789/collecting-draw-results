import https from 'https';
import { LatestResponse } from './types';

const API_URL = 'https://api.cc138001.com/server/lottery/latest/ygxy5';

/** 最大重试次数 */
const MAX_RETRIES = 30;
/** 重试间隔（毫秒） */
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchOnce(): Promise<LatestResponse> {
  return new Promise((resolve, reject) => {
    https
      .get(API_URL, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP Error: ${res.statusCode} ${res.statusMessage}`));
          res.resume();
          return;
        }

        let rawData = '';
        res.on('data', (chunk: Buffer) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const data = JSON.parse(rawData);
            resolve(data as LatestResponse);
          } catch (e) {
            reject(new Error(`JSON parse error: ${e}`));
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * 从 API 获取最新一期开奖结果，失败时自动重试。
 */
export async function fetchLatestResult(): Promise<LatestResponse> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fetchOnce();

      if (result.code !== 0) {
        throw new Error(`API returned non-200 code: ${result.code}, msg: ${result.msg}`);
      }

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[fetchLatest] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(`Failed to fetch after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`);
}
