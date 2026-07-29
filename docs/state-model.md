# 游戏状态模型

## 1. 目标

集中管理游戏状态

## 2. 状态分类

### 跨局设置

- settings
- 原因：用户选择的难度、模式和联赛应在新游戏中保留。

### 每局状态

- answer
- attemptsLeft
- gameOver
- correctlyGuessed
- hintsUsed

### UI 临时状态

- activeIndex
- currentMsgKey
- currentMsgArgs
- currentMsgTone

UI 临时状态本次是否迁移：否。