/**
 * 创建一局游戏的初始状态。
 *
 * 输入：
 * - answer：本局答案，可以暂时为 null
 * - difficulty：本局允许的猜测次数
 *
 * 输出：
 * - 一个全新的游戏状态对象
 *
 * 不负责：
 * - 修改 settings
 * - 操作 DOM
 * - 随机选择球员
 * - 发起网络请求
 */
export const resetGameState = ({ answer = null, difficulty }) => {
  // difficulty 必须是大于 0 的整数
  if (!Number.isInteger(difficulty) || difficulty <= 0) {
    throw new RangeError("difficulty must be a positive integer");
  }

  // 每次调用都返回全新的状态对象
  return {
    answer,
    attemptsLeft: difficulty,
    gameOver: false,
    correctlyGuessed: new Set(),
    hintsUsed: 0
  };
};