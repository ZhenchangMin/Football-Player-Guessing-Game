# Football-Player-Guessing-Game

一个参考 Transfermarkt「Who am I」玩法的网页小游戏：

- 系统随机挑选一位现役球员作为谜底；
- 玩家在限定次数内提交猜测；
- 每次猜测都会反馈年龄、位置、号码、俱乐部、联赛、国籍是否匹配；
- 数值字段（年龄、号码）会给出“偏大 / 偏小”提示。

## 当前实现

- 前端技术：原生 HTML + CSS + JavaScript
- 数据：真实球员数据库（`data/players.real.json`）
- 交互：自动补全输入、猜测历史表格、游戏胜负状态
- 功能：难度设置、身价筛选、游戏说明
