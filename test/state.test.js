import test from "node:test";
import assert from "node:assert/strict";
import { resetGameState } from "../src/game/state.js";
test("resetGameState：使用指定答案和难度初始化新局", () => {
  const answer = { name: "Messi" };

  const state = resetGameState({
    answer,
    difficulty: 8
  });

  assert.equal(state.answer, answer);
  assert.equal(state.attemptsLeft, 8);
  assert.equal(state.gameOver, false);
  assert.equal(state.hintsUsed, 0);
  assert.deepEqual(state.correctlyGuessed, new Set());
});

test("resetGameState：使用非法难度", () => {
  assert.throws(
    () => resetGameState({ difficulty: 0 }),
    RangeError
  );
});

test("resetGameState：不同游戏不会共享 correctlyGuessed", () => {
  // Arrange：分别创建两局游戏
  const first = resetGameState({ difficulty: 8 });
  const second = resetGameState({ difficulty: 8 });

  // Act：只修改第一局
  first.correctlyGuessed.add("age");

  // Assert：第一局发生变化，第二局不受影响
  assert.equal(first.correctlyGuessed.size, 1);
  assert.equal(second.correctlyGuessed.size, 0);

  // 两局使用的 Set 不是同一个对象
  assert.notEqual(
    first.correctlyGuessed,
    second.correctlyGuessed
  );
});