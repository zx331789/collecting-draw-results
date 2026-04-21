import { Schema, model, Document, Types } from 'mongoose';

/**
 * 开奖号码结果 Schema
 * 用于保存每期的开奖号码和开奖时间
 */
export interface ILotteryDraw extends Document {
  /** 期号（PeriodNo，唯一） */
  PeriodNo: number;
  /** 开奖号码数组（例如：[1, 2, 3, 4, 5]） */
  numbers: number[];
  /** 开奖时间 */
  drawTime?: string;
}

const lotteryDrawSchema = new Schema<ILotteryDraw>(
  {
    PeriodNo: { type: Number, required: true, unique: true },
    numbers: { type: [Number], required: true, default: [] },
    drawTime: { type: String },
  },
  { collection: 'lottery_draws', timestamps: true },
);

export const LotteryDraw = model<ILotteryDraw>('LotteryDraw', lotteryDrawSchema);
