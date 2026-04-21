export interface DrawResult {
  /** 期号，如 "2024001" */
  issue: string;
  /** 开奖号码，逗号分隔，如 "1,2,3,4,5" */
  draw_code: string;
  /** 开奖时间，如 "2024-01-01 12:00:00" */
  draw_time: string;
  /** 下一期期号 */
  next_issue: string;
  /** 下一期开奖时间 */
  next_draw_time: string;
}

export interface LatestResponse {
  /** 状态码，200 表示成功 */
  code: number;
  /** 状态消息 */
  msg: string;
  /** 开奖数据 */
  data: DrawResult;
}
