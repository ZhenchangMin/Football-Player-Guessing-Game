// 按位置线分组（用于判断位置是否"接近"）
const FRONT_POSITIONS = ["ST", "LW", "RW"];          // 前锋线
const MIDFIELD_POSITIONS = ["CAM", "CM", "CDM", "LM", "RM"]; // 中场线
const BACK_POSITIONS = ["CB", "LB", "RB"];           // 后卫线

// 比较文字（俱乐部/联赛）：只有完全相同才绿
export const compareText = (guess, target) =>
  guess === target ? { className: "correct" } : { className: "wrong" };

// 判断球员所在的位置线（前锋/中场/后卫/门将）
export const getPositionLine = (position) => {
  const upper = String(position).trim().toUpperCase();
  if (upper === "GK") return "goalkeeper";
  if (FRONT_POSITIONS.includes(upper)) return "front";
  if (MIDFIELD_POSITIONS.includes(upper)) return "midfield";
  if (BACK_POSITIONS.includes(upper)) return "back";
  return null;
};

// 比较位置：相同→绿，同线→黄，其他→红
export const comparePosition = (guess, target) => {
  if (guess === target) {
    return { className: "correct" };
  }

  const guessLine = getPositionLine(guess);
  const targetLine = getPositionLine(target);
  if (guessLine && targetLine && guessLine === targetLine) {
    return { className: "partial" };
  }

  return { className: "wrong" };
};

