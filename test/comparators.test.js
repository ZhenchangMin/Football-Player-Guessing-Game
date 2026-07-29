import test from "node:test";
import assert from "node:assert/strict";
import {
  compareMarketValue,
  compareNation,
  compareNumber,
  comparePosition,
  compareText,
  getPositionLine
} from "../src/game/comparators.js";

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

test("compareText：缺失字段不会被判断为相同", () => {
  assert.deepEqual(compareText(undefined, undefined), { className: "wrong" });
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

test("comparePosition：缺失字段返回 wrong", () => {
  assert.deepEqual(comparePosition(undefined, undefined), { className: "wrong" });
});

test("compareNumber：相等返回 correct", () => {
  assert.deepEqual(compareNumber(25, 25), { className: "correct", hint: "" });
});

test("compareNumber：相差 1 返回 partial 和方向提示", () => {
  const result = compareNumber(26, 25);

  assert.equal(result.className, "partial");
  assert.match(result.hint, /hint-down/);
});

test("compareNumber：偏小返回 wrong 和向上提示", () => {
  const result = compareNumber(20, 25);

  assert.equal(result.className, "wrong");
  assert.match(result.hint, /hint-up/);
});

test("compareNumber：缺失数字返回 wrong", () => {
  assert.deepEqual(compareNumber(undefined, 25), { className: "wrong", hint: "" });
});

test("compareNation：相同国家返回 correct", () => {
  assert.deepEqual(compareNation("Brazil", "Brazil"), { className: "correct" });
});

test("compareNation：同洲不同国家返回 partial", () => {
  assert.deepEqual(compareNation("Brazil", "Argentina"), { className: "partial" });
});

test("compareNation：不同洲返回 wrong", () => {
  assert.deepEqual(compareNation("Brazil", "Germany"), { className: "wrong" });
});

test("compareNation：未知或缺失国籍返回 wrong", () => {
  assert.deepEqual(compareNation(undefined, undefined), { className: "wrong" });
  assert.deepEqual(compareNation("Unknown A", "Unknown B"), { className: "wrong" });
});

test("compareMarketValue：相同身价返回 correct", () => {
  assert.deepEqual(
    compareMarketValue(50_000_000, 50_000_000),
    { className: "correct", hint: "" }
  );
});

test("compareMarketValue：阈值内返回 partial", () => {
  const result = compareMarketValue(55_000_000, 50_000_000);

  assert.equal(result.className, "partial");
  assert.match(result.hint, /hint-down/);
});

test("compareMarketValue：阈值外返回 wrong", () => {
  const result = compareMarketValue(30_000_000, 50_000_000);

  assert.equal(result.className, "wrong");
  assert.match(result.hint, /hint-up/);
});

test("compareMarketValue：缺失数字返回 wrong", () => {
  assert.deepEqual(
    compareMarketValue(undefined, 50_000_000),
    { className: "wrong", hint: "" }
  );
});
