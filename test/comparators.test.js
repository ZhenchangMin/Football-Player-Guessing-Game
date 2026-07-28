import test from "node:test";
import assert from "node:assert/strict";
import { compareText, getPositionLine, comparePosition } from "../src/game/comparators.js";

test("compareText：文本完全相同时返回 correct", () => {
  // Arrange：准备输入
  const guess = "Brazil";
  const target = "Brazil";

  const actual = compareText(guess, target);
  assert.deepEqual(actual, {className: "correct"});
});

test("compareText：文本不同时返回 wrong", () => {
  // Arrange：准备输入
  const guess = "Brazil";
  const target = "Argentina";

  const actual = compareText(guess, target);
  assert.deepEqual(actual, {className: "wrong"});
});

test("getPositionLine：ST返回front", () => {
  // Arrange：准备输入
  const position = "ST";

  const actual = getPositionLine(position);
  assert.deepEqual(actual, "front");
});

test("getPositionLine：CM 返回 midfield", () => {
  const position = "CM";

  const actual = getPositionLine(position);

  assert.deepEqual(actual, "midfield");
});

test("getPositionLine：CB 返回 back", () => {
  const position = "CB";

  const actual = getPositionLine(position);

  assert.deepEqual(actual, "back");
});

test("getPositionLine：GK 返回 goalkeeper", () => {
  const position = "GK";

  const actual = getPositionLine(position);

  assert.deepEqual(actual, "goalkeeper");
});

test("getPositionLine：未知位置返回 null", () => {
  const position = "UNKNOWN";

  const actual = getPositionLine(position);

  assert.equal(actual, null);
});

test("getPositionLine：忽略位置代码两侧空格和大小写", () => {
  const position = " st ";

  const actual = getPositionLine(position);

  assert.deepEqual(actual, "front");
});

test("comparePosition: ST和ST返回correct", () => {
    const guess = "ST";
    const target = "ST";
    const result = comparePosition(guess, target);
    assert.deepEqual(result, { className: "correct" });
});

test("comparePosition: ST和LW返回partial", () => {
    const guess = "ST";
    const target = "LW";
    const result = comparePosition(guess, target);
    assert.deepEqual(result, { className: "partial" });
});

test("comparePosition: ST和CM返回wrong", () => {
    const guess = "ST";
    const target = "CM";
    const result = comparePosition(guess, target);
    assert.deepEqual(result, { className: "wrong" });
});

test("comparePosition: UNKNOWN和ST返回wrong", () => {
    const guess = "UNKNOWN";
    const target = "ST";
    const result = comparePosition(guess, target);
    assert.deepEqual(result, { className: "wrong" });
});
