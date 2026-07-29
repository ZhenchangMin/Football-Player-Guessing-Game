// ================================================================
// app.js — 游戏主逻辑
// JavaScript 的基本结构：
//   - 变量（let/const）：存储数据
//   - 函数（function / () => {}）：封装一段可复用的操作
//   - 事件监听（addEventListener）：响应用户操作
// ================================================================

// import：从另一个 JS 文件导入功能（ES Module 语法）
// t() = 翻译函数，根据当前语言返回对应文字
// setLang/initLang/currentLang = 语言相关工具函数
import { t, setLang, initLang, currentLang } from './i18n.js';
import {
  compareMarketValue,
  compareNation,
  compareNumber,
  comparePosition,
  compareText
} from "./src/game/comparators.js";
import { resetGameState } from "./src/game/state.js";

// ── Supabase（后端）配置 ──────────────────────────────────────
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const API_BASE = 'http://localhost:3000';

// ── 游戏常量（const = 常量，不会改变的值） ────────────────────
const MAX_ATTEMPTS = 8;                              // 默认最大猜测次数
const DATA_URL = "./data/players.real.json";         // 球员数据文件路径
const REQUIRED_FIELDS = ["name", "age", "position", "number", "club", "league", "nation"];
// REQUIRED_FIELDS：每个球员数据必须包含这些字段，用来过滤不完整的数据



// ── 全局数据 ──────────────────────────────────────────────────
let players = [];
// 中超专用的身价刻度（单位：百万欧元）
// 中超球员身价普遍较低，用线性刻度精度不够，所以用这个自定义刻度
const MV_SCALE_CSL = [0, 0.5, 1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 75, 100, 150, 200];
const MV_NO_LIMIT = 200;      // 200 代表"不限上限"的哨兵值
const sliderToMv = (idx) => MV_SCALE_CSL[Math.max(0, Math.min(idx, MV_SCALE_CSL.length - 1))];
// sliderToMv：将滑块的索引位置转换为对应的身价值（用 Math.max/min 防止越界）

// 判断是否处于"仅中超"模式
const isCslOnlyMode = () =>
  settings.mode === "league" &&
  settings.selectedLeagues.size === 1 &&
  settings.selectedLeagues.has("Chinese Super League");

// ── 游戏设置（对象存储多个相关的值） ─────────────────────────
// 对象（Object）：用 {} 包裹，存储键值对
const settings = {
  difficulty: 8,              // 难度（猜测次数）
  mvMinM: 10,                 // 身价最小值（百万欧元）
  mvMaxM: MV_NO_LIMIT,        // 身价最大值
  mode: "all",                // 游戏模式：all / top100 / top250 / league / daily
  selectedLeagues: new Set()  // Set：集合，存储选中的联赛（不重复）
};

// ── 获取当前设置下的有效球员池 ───────────────────────────────
// 箭头函数（Arrow Function）：() => {} 是函数的简短写法
const getActivePlayers = () => {
  let pool = players;  // 从全部球员开始

  // 根据游戏模式过滤
  if (settings.mode === "top250" || settings.mode === "top100") {
    const topN = settings.mode === "top250" ? 250 : 100;
    // 三元运算符：条件 ? 值A : 值B
    pool = [...players]        // [...players] 创建数组的副本（避免修改原数组）
      .filter((p) => Number.isFinite(p.marketValueEur))  // 只保留有身价数据的球员
      .sort((a, b) => b.marketValueEur - a.marketValueEur)  // 按身价从高到低排序
      .slice(0, topN);         // 取前 topN 名
  } else if (settings.mode === "league") {
    pool = settings.selectedLeagues.size > 0
      ? players.filter((p) => settings.selectedLeagues.has(p.league))
      : [];
  }

  // 再根据身价范围过滤
  const minEur = settings.mvMinM * 1_000_000;     // 转换为欧元（1M = 1,000,000）
  const noMax = settings.mvMaxM >= MV_NO_LIMIT;    // 是否不限上限
  const maxEur = settings.mvMaxM * 1_000_000;

  return pool.filter((p) => {
    if (!Number.isFinite(p.marketValueEur)) {
      return settings.mvMinM === 0 && noMax;  // 无身价数据的球员：只在不限范围时包含
    }
    if (p.marketValueEur < minEur) return false;
    if (!noMax && p.marketValueEur > maxEur) return false;
    return true;
  });
};

// 格式化身价显示：把数字转成 "€10M" 这样的字符串
const formatMVLabel = (valueM) => {
  if (valueM >= MV_NO_LIMIT) return t('mv_no_limit');   // 显示"不限"
  if (valueM === 0) return "€0";
  if (valueM < 1) return `€${(valueM * 1000).toFixed(0)}K`;  // 模板字符串（反引号）
  return `€${valueM}M`;
};

// 更新"当前共有 X 位球员"的提示文字
const updatePoolSizeInfo = () => {
  const el = document.querySelector("#pool-size-info");
  if (!el || !players.length) return;
  const count = getActivePlayers().length;
  el.textContent = t('pool_size', count);
};

// ── 获取 DOM 元素引用 ────────────────────────────────────────
// document.querySelector：通过 CSS 选择器找到页面上的元素
// 找到一次后存入变量，避免重复查询
const guessInput = document.querySelector("#player-guess");    // 输入框
const guessBtn = document.querySelector("#guess-btn");         // 提交按钮
const hintBtn = document.querySelector("#hint-btn");           // 提示按钮
const surrenderBtn = document.querySelector("#surrender-btn"); // 投降按钮
const newGameBtn = document.querySelector("#new-game-btn");    // 新游戏按钮
const attemptsLabel = document.querySelector("#attempts");     // 剩余次数显示
const maxAttemptsLabel = document.querySelector("#max-attempts-label");  // 标题里的次数
const messageLabel = document.querySelector("#message");       // 游戏消息区
const historyBody = document.querySelector("#history-body");   // 猜测历史表格的 tbody
const autocompleteList = document.querySelector("#autocomplete-list");  // 自动补全下拉框
const langBtn = document.querySelector("#lang-btn");           // 语言切换按钮

// ── 游戏状态变量 ─────────────────────────────────────────────
let gameState = resetGameState({
  difficulty: MAX_ATTEMPTS
});
const MAX_HINTS = 3;          // 最多 3 次提示
let activeIndex = -1;         // 自动补全列表中当前高亮的项索引（-1 = 无）

// 记录当前消息的翻译 key，方便切换语言时重新翻译
let currentMsgKey = '';
let currentMsgArgs = [];
let currentMsgTone = 'normal';

// ── 提示功能的属性定义 ───────────────────────────────────────
// 定义每个可以作为提示的属性：标签名、取值方式、对应表格第几列
const HINT_ATTR_DEFS = {
  age:            { key: "age",            get label() { return t('attr_age'); },   format: (v) => String(v),          col: 1 },
  position:       { key: "position",       get label() { return t('attr_position'); }, format: (v) => String(v),       col: 2 },
  number:         { key: "number",         get label() { return t('attr_number'); }, format: (v) => String(v),         col: 3 },
  marketValueEur: { key: "marketValueEur", get label() { return t('attr_mv'); },    format: (v) => formatMarketValue(v), col: 4 },
  club:           { key: "club",           get label() { return t('attr_club'); },  format: (v) => String(v),          col: 5 },
  league:         { key: "league",         get label() { return t('attr_league'); }, format: (v) => String(v),         col: 6 },
  nation:         { key: "nation",         get label() { return t('attr_nation'); }, format: (v) => String(v),         col: 7 },
  // get label()：getter 语法，每次访问 .label 时动态调用 t()，确保语言切换后文字也跟着变
};

// 不同难度下提示的揭示顺序（先揭示哪个属性）
const HINT_ORDER = {
  10: ["league", "club", "nation", "position", "age", "marketValueEur", "number"],   // 简单：先给联赛和俱乐部
   8: ["league", "nation", "position", "age", "marketValueEur", "club", "number"],   // 普通：平衡顺序
   5: ["number", "marketValueEur", "age", "nation", "league", "position", "club"],   // 困难：先给最没用的号码
};

// 返回当前难度对应的提示属性有序列表
const getHintAttrs = () => {
  const order = HINT_ORDER[settings.difficulty] ?? HINT_ORDER[8];  // ?? 空值合并：左边为 null/undefined 时用右边
  return order.map((k) => HINT_ATTR_DEFS[k]);  // .map()：把数组每个元素转换成另一种形式
};

// ── 字符串处理工具函数 ───────────────────────────────────────

// 基础标准化：转小写、去首尾空白
const normalize = (value) => String(value).trim().toLowerCase();

// 搜索专用标准化：额外去掉重音符号（é→e）、土耳其字母（ş→s）等
// 这样搜索 "Eriksen" 也能找到 "Eriksen"，搜 "haaland" 也能找到 "Haaland"
const normalizeSearch = (value) =>
  normalize(value)
    .replace(/[ıİ]/g, "i")    // 土耳其字母：dotless i → i
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .normalize("NFD")          // Unicode 分解：把 "é" 拆成 "e" + 重音符
    .replace(/[\u0300-\u036f]/g, "")  // 删除所有重音符（Unicode 区间 0300-036F）
    .replace(/['\u2018\u2019\u02bc`-]/g, "");  // 删除各种引号和连字符

// 判断球员名字是否匹配搜索词（支持词序颠倒）
// 例：搜 "lei wu" 可以匹配 "Wu Lei"
const matchesSearch = (playerName, searchTerm) => {
  const normName = normalizeSearch(playerName);
  const normTerm = normalizeSearch(searchTerm);
  if (!normTerm) return false;
  if (normName.includes(normTerm)) return true;  // 直接包含则匹配

  // 把搜索词拆成单词，要求每个单词都出现在名字的某个单词里
  const termWords = normTerm.split(/\s+/).filter(Boolean);  // split 按空白分割
  const nameWords = normName.split(/\s+/);
  return termWords.every((tw) => nameWords.some((nw) => nw.includes(tw)));
  // .every()：数组所有元素都满足条件时返回 true
  // .some()：数组至少一个元素满足条件时返回 true
};

// ── 消息显示函数 ─────────────────────────────────────────────

// 直接设置消息文字和颜色
const setMessage = (text, tone = "normal") => {
  messageLabel.textContent = text;       // 修改 DOM 元素的文字内容
  if (tone === "ok") {
    messageLabel.style.color = "#166534";   // 成功：绿色
  } else if (tone === "error") {
    messageLabel.style.color = "#b91c1c";   // 错误：红色
  } else {
    messageLabel.style.color = "#1f2937";   // 普通：深灰
  }
};

// 通过翻译 key 设置消息（切换语言时可以重新翻译）
const setMessageByKey = (key, tone = "normal", ...args) => {
  // ...args：rest 参数，收集所有额外参数到数组
  currentMsgKey = key;
  currentMsgArgs = args;
  currentMsgTone = tone;
  setMessage(t(key, ...args), tone);
};

// 格式化身价数字为可读字符串（如：€95.0M）
const formatMarketValue = (valueEur) => {
  if (!Number.isFinite(valueEur)) return "-";
  if (valueEur >= 1_000_000_000) return `€${(valueEur / 1_000_000_000).toFixed(2)}B`;  // 十亿级
  if (valueEur >= 1_000_000) return `€${(valueEur / 1_000_000).toFixed(1)}M`;           // 百万级
  if (valueEur >= 1_000) return `€${(valueEur / 1_000).toFixed(1)}K`;                   // 千级
  return `€${valueEur}`;
};

// ── DOM 操作：向历史表格插入行 ───────────────────────────────

// 创建一个 <td> 的 HTML 字符串
const createCell = (value, className, hint = "") => `<td class="${className}">${value}${hint}</td>`;

// 插入一行猜测记录（对比所有属性，着色，插入表格顶部）
const addHistoryRow = (guessPlayer) => {
  // 对每个属性进行比较
  const ageResult = compareNumber(guessPlayer.age, gameState.answer.age);
  const numberResult = compareNumber(guessPlayer.number, gameState.answer.number);
  const marketValueResult = compareMarketValue(guessPlayer.marketValueEur, gameState.answer.marketValueEur);
  const positionResult = comparePosition(guessPlayer.position, gameState.answer.position);
  const clubResult = compareText(guessPlayer.club, gameState.answer.club);
  const leagueResult = compareText(guessPlayer.league, gameState.answer.league);
  const nationResult = compareNation(guessPlayer.nation, gameState.answer.nation);

  // document.createElement：动态创建一个 HTML 元素
  const tr = document.createElement("tr");
  // .innerHTML：设置元素内部的 HTML 字符串（会解析为实际 HTML）
  tr.innerHTML = `
    ${createCell(guessPlayer.name, guessPlayer.name === gameState.answer.name ? "correct" : "wrong")}
    ${createCell(guessPlayer.age, ageResult.className, ageResult.hint)}
    ${createCell(guessPlayer.position, positionResult.className)}
    ${createCell(guessPlayer.number, numberResult.className, numberResult.hint)}
    ${createCell(formatMarketValue(guessPlayer.marketValueEur), marketValueResult.className, marketValueResult.hint)}
    ${createCell(guessPlayer.club, clubResult.className)}
    ${createCell(guessPlayer.league, leagueResult.className)}
    ${createCell(guessPlayer.nation, nationResult.className)}
  `;
  historyBody.prepend(tr);  // .prepend()：插入到父元素的最前面（最新猜测显示在最上方）

  // 记录已经猜对的属性（提示功能不再提示已知的属性）
  if (ageResult.className === "correct")         gameState.correctlyGuessed.add("age");
  if (positionResult.className === "correct")    gameState.correctlyGuessed.add("position");
  if (numberResult.className === "correct")      gameState.correctlyGuessed.add("number");
  if (marketValueResult.className === "correct") gameState.correctlyGuessed.add("marketValueEur");
  if (clubResult.className === "correct")        gameState.correctlyGuessed.add("club");
  if (leagueResult.className === "correct")      gameState.correctlyGuessed.add("league");
  if (nationResult.className === "correct")      gameState.correctlyGuessed.add("nation");
};

// 游戏结束时在最顶部插入"答案揭晓"行
const addAnswerRow = () => {
  const tr = document.createElement("tr");
  tr.className = "answer-row";
  tr.innerHTML = `
    <td class="answer-label-cell"><span class="answer-tag">${t('tag_answer')}</span>${gameState.answer.name}</td>
    <td>${gameState.answer.age}</td>
    <td>${gameState.answer.position}</td>
    <td>${gameState.answer.number}</td>
    <td>${formatMarketValue(gameState.answer.marketValueEur)}</td>
    <td>${gameState.answer.club}</td>
    <td>${gameState.answer.league}</td>
    <td>${gameState.answer.nation}</td>
  `;
  historyBody.prepend(tr);
};

// 在表格顶部插入提示行（揭示某个属性的值）
const addHintRow = (attr) => {
  const tr = document.createElement("tr");
  tr.className = "hint-row";
  // Array.from({length: 8}, ...) 创建长度为 8 的数组，用回调函数填充每个元素
  const cells = Array.from({ length: 8 }, (_, i) => {
    if (i === 0) return `<td><span class="hint-tag">${t('tag_hint')}</span> ${attr.label}</td>`;
    if (i === attr.col) return `<td class="hint-value">${attr.format(gameState.answer[attr.key])}</td>`;
    // gameState.answer[attr.key]：动态属性访问，等同于 gameState.answer.age / gameState.answer.club 等
    return `<td>—</td>`;
  });
  tr.innerHTML = cells.join("");   // .join("")：把数组的字符串拼接成一个字符串
  historyBody.prepend(tr);
};

// ── 提示按钮逻辑 ─────────────────────────────────────────────

// 更新提示按钮的文字和禁用状态
const updateHintBtn = () => {
  const remaining = MAX_HINTS - gameState.hintsUsed;
  hintBtn.textContent = t('btn_hint_count', remaining);
  hintBtn.disabled = remaining <= 0 || gameState.gameOver;  // 用完或游戏结束时禁用
};

// 点击提示按钮时的处理函数
const handleHint = () => {
  if (gameState.gameOver || !gameState.answer || gameState.hintsUsed >= MAX_HINTS) return;  // 提前退出

  // 找到第一个还没被猜对、也没被揭示过的属性
  const next = getHintAttrs().find((a) => !gameState.correctlyGuessed.has(a.key));
  // .find()：找到第一个满足条件的元素
  if (!next) {
    setMessageByKey('msg_hint_all_correct', "normal");
    return;
  }

  gameState.hintsUsed += 1;
  gameState.correctlyGuessed.add(next.key);  // 标记为"已知"，下次提示跳过它
  addHintRow(next);
  updateHintBtn();
  setMessageByKey('msg_hint_reveal', "normal", gameState.hintsUsed, MAX_HINTS, next.label, next.format(gameState.answer[next.key]));
};

// ── 游戏状态控制 ─────────────────────────────────────────────

// 批量设置所有操作按钮的禁用状态
const togglePlayState = (disabled) => {
  guessBtn.disabled = disabled;
  hintBtn.disabled = disabled || gameState.hintsUsed >= MAX_HINTS;
  guessInput.disabled = disabled;
  surrenderBtn.disabled = disabled;
  newGameBtn.disabled = false;   // 新游戏按钮永远可以点击
};

// 游戏结束（won = 是否获胜）
const endGame = (won) => {
  gameState.gameOver = true;
  togglePlayState(true);   // 禁用所有操作

  const attemptsUsed = settings.difficulty - gameState.attemptsLeft + (won ? 0 : 0);

  if (won) {
    setMessageByKey('msg_won', "ok", gameState.answer.name);   // 显示胜利消息
  } else {
    addAnswerRow();   // 揭示答案
    setMessageByKey('msg_lost', "error", gameState.answer.name);
  }

  submitScore(settings.difficulty - gameState.attemptsLeft, won);  // 异步提交分数（不阻塞游戏）
};

// 点击"投降"按钮
const handleSurrender = () => {
  if (gameState.gameOver || !gameState.answer) return;
  gameState.attemptsLeft = 0;
  updateAttempts();
  gameState.gameOver = true;
  togglePlayState(true);
  addAnswerRow();
  setMessageByKey('msg_surrender', "error", gameState.answer.name);
};

// 更新剩余次数显示
const updateAttempts = () => {
  attemptsLabel.textContent = t('attempts_left', gameState.attemptsLeft);
};

// ── 数据加载与验证 ───────────────────────────────────────────

// 验证并清洗原始球员数据（过滤掉不完整或格式错误的条目）
const validatePlayersData = (rawData) => {
  if (!Array.isArray(rawData)) return [];  // 如果不是数组，返回空数组

  return rawData
    .filter((item) =>
      REQUIRED_FIELDS.every(
        (field) => item && Object.prototype.hasOwnProperty.call(item, field)
        // 检查 item 是否有这个字段（更安全的写法，避免 hasOwnProperty 被覆盖的情况）
      )
    )
    .map((item) => ({
      // .map()：把每个原始数据对象转换成统一格式的球员对象
      name: String(item.name).trim(),
      age: Number(item.age),          // Number()：转换为数字
      position: String(item.position).trim(),
      number: Number(item.number),
      marketValueEur: Number.isFinite(Number(item.marketValueEur))
        ? Number(item.marketValueEur)
        : null,                        // 身价可能缺失，不合法时设为 null
      club: String(item.club).trim(),
      league: String(item.league).trim(),
      nation: String(item.nation).trim()
    }))
    .filter(
      (item) =>
        item.name &&
        Number.isFinite(item.age) &&
        item.position &&
        Number.isFinite(item.number) &&
        item.club &&
        item.league &&
        item.nation
    );
};

// 从 JSON 文件加载球员数据（async/await：异步操作，不阻塞页面）
const loadPlayers = async () => {
  // fetch：发起 HTTP 请求获取文件，返回 Promise
  const response = await fetch(DATA_URL, { cache: "no-store" });
  // await：等待 Promise 完成（异步但写起来像同步）
  // cache: "no-store"：不缓存，每次都重新请求最新数据

  if (!response.ok) {
    throw new Error(t('msg_db_fail_http', response.status));
    // throw new Error：抛出错误，会被外层的 try-catch 捕获
  }

  const rawData = await response.json();   // 把响应体解析为 JS 对象/数组
  const validated = validatePlayersData(rawData);

  if (!validated.length) {
    throw new Error(t('msg_db_empty'));
  }

  players = validated;   // 赋值给全局 players 变量
};

// ── 开始游戏 ─────────────────────────────────────────────────
const startGame = () => {
  if (settings.mode === 'daily') {
    startDailyChallenge();   // 每日挑战需要从后端获取谜底
    return;
  }

  if (!players.length) {
    setMessageByKey('msg_db_not_ready', "error");
    togglePlayState(true);
    return;
  }

  const pool = getActivePlayers();
  if (!pool.length) {
    if (settings.mode === "league" && settings.selectedLeagues.size === 0) {
      setMessageByKey('msg_no_league', "error");
    } else {
      setMessageByKey('msg_no_players', "error");
    }
    return;
  }

  // 从球员池中随机选一个作为答案
  const selectedAnswer = pool[Math.floor(Math.random() * pool.length)];
  // Math.random()：生成 [0, 1) 的随机数
  // Math.floor()：向下取整

  // 重置游戏状态
  gameState = resetGameState({
    answer: selectedAnswer,
    difficulty: settings.difficulty
  });
  historyBody.innerHTML = "";    // 清空历史表格
  guessInput.value = "";
  closeAutocomplete();
  maxAttemptsLabel.textContent = String(settings.difficulty);
  updateAttempts();
  togglePlayState(false);
  updateHintBtn();
  setMessageByKey('msg_new_game');
  guessInput.focus();            // 让输入框获得焦点，用户可以直接打字
};

// ── 处理猜测 ─────────────────────────────────────────────────
const handleGuess = () => {
  if (gameState.gameOver) return;

  const raw = guessInput.value;
  const normRaw = normalizeSearch(raw);

  // 先精确匹配，再模糊匹配（处理重音字母等）
  const guessPlayer =
    players.find((player) => player.name === raw) ||
    players.find((player) => normalizeSearch(player.name) === normRaw || matchesSearch(player.name, raw));
  // .find()：返回第一个满足条件的元素，找不到返回 undefined

  if (!guessPlayer) {
    setMessageByKey('msg_not_found', "error");
    return;
  }

  addHistoryRow(guessPlayer);    // 插入历史记录行
  guessInput.value = "";
  closeAutocomplete();
  gameState.attemptsLeft -= 1;             // 次数减一
  updateAttempts();

  if (guessPlayer.name === gameState.answer.name) {
    endGame(true);               // 猜中了，游戏胜利
    return;
  }

  if (gameState.attemptsLeft <= 0) {
    endGame(false);              // 用完次数，游戏失败
    return;
  }

  setMessageByKey('msg_keep_going', "normal");
};

// ── 自动补全下拉框 ───────────────────────────────────────────

// 关闭并清空自动补全列表
const closeAutocomplete = () => {
  autocompleteList.innerHTML = "";
  autocompleteList.style.display = "none";   // 用 style 直接控制显示/隐藏
  activeIndex = -1;
};

// 设置键盘高亮项（上下键导航）
const setActiveIndex = (idx) => {
  const items = autocompleteList.querySelectorAll(".autocomplete-item");
  // .querySelectorAll()：返回所有匹配的元素（NodeList，类似数组）
  if (!items.length) return;
  activeIndex = Math.max(0, Math.min(idx, items.length - 1));  // 限制在有效范围内
  items.forEach((item, i) => item.classList.toggle("active", i === activeIndex));
  // .forEach()：遍历数组/NodeList
  // .classList.toggle(class, bool)：bool 为 true 时加 class，false 时去掉
  items[activeIndex].scrollIntoView({ block: "nearest" });  // 滚动让高亮项可见
};

// 根据输入关键词更新自动补全列表
const updateDatalistByKeyword = (keyword) => {
  const term = normalizeSearch(keyword);
  if (!term) {
    closeAutocomplete();
    return;
  }

  const matchedPlayers = getActivePlayers()
    .filter((player) => matchesSearch(player.name, keyword))
    .sort((a, b) => a.name.localeCompare(b.name))  // 按名字字母顺序排序
    .slice(0, 50);   // 最多显示 50 个候选项

  if (!matchedPlayers.length) {
    closeAutocomplete();
    return;
  }

  // 用模板字符串生成列表 HTML
  autocompleteList.innerHTML = matchedPlayers
    .map((player) => `<div class="autocomplete-item" data-name="${player.name}">${player.name}<span class="autocomplete-club"> · ${player.club}</span></div>`)
    .join("");
  autocompleteList.style.display = "block";

  // 给每个候选项绑定点击事件
  autocompleteList.querySelectorAll(".autocomplete-item").forEach((item) => {
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();   // 阻止默认行为（防止 input 失去焦点）
      guessInput.value = item.dataset.name;   // .dataset：访问 data-* 属性
      closeAutocomplete();
    });
    item.addEventListener("mousemove", () => {
      const idx = [...autocompleteList.querySelectorAll(".autocomplete-item")].indexOf(item);
      // [...NodeList]：把 NodeList 转成真正的数组，才能用 .indexOf()
      setActiveIndex(idx);
    });
  });

  setActiveIndex(0);   // 默认高亮第一项
};

// ── 国际化（i18n）：翻译所有页面文字 ─────────────────────────
const applyI18n = () => {
  document.title = t('title');

  // 找到所有带 data-i18n 属性的元素，把它们的文字替换为翻译后的版本
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  guessInput.placeholder = t('placeholder');

  // 语言按钮显示"切换到另一种语言"的名称
  if (langBtn) langBtn.textContent = currentLang === 'zh' ? '🌐 EN' : '🌐 中文';

  // 更新所有动态 UI
  updateHintBtn();
  updateAttempts();
  updatePoolSizeInfo();

  // 重新翻译当前的游戏消息
  if (currentMsgKey) {
    setMessage(t(currentMsgKey, ...currentMsgArgs), currentMsgTone);
  }

  if (players.length) buildLeagueSelector();

  // 更新"不限"文字
  const mvMaxDisplay = document.querySelector("#mv-max-display");
  if (mvMaxDisplay && settings.mvMaxM >= MV_NO_LIMIT) {
    mvMaxDisplay.textContent = t('mv_no_limit');
  }
};

// ── 初始化游戏（页面加载时执行一次） ─────────────────────────
const initializeGame = async () => {
  initLang();       // 从 localStorage 读取保存的语言设置
  applyI18n();      // 应用翻译

  setMessageByKey('msg_loading');
  togglePlayState(true);   // 加载完成前禁用操作

  try {
    await loadPlayers();          // 等待数据加载完成
    buildLeagueSelector();        // 构建联赛选择器
    updatePoolSizeInfo();
    startGame();
  } catch (error) {
    setMessageByKey('msg_load_fail', "error", error.message);
    togglePlayState(true);
  }
};

// ── 身价滑块的 DOM 引用 ──────────────────────────────────────
const mvMinSlider = document.querySelector("#mv-min");
const mvMaxSlider = document.querySelector("#mv-max");
const mvMinDisplay = document.querySelector("#mv-min-display");
const mvMaxDisplay = document.querySelector("#mv-max-display");

// 切换滑块刻度（普通模式 vs 中超模式）
const updateSliderScale = () => {
  if (isCslOnlyMode()) {
    const lastIdx = MV_SCALE_CSL.length - 1;
    mvMinSlider.min = 0; mvMinSlider.max = lastIdx - 1; mvMinSlider.step = 1;
    mvMaxSlider.min = 1; mvMaxSlider.max = lastIdx;     mvMaxSlider.step = 1;
    mvMinSlider.value = 0;
    mvMaxSlider.value = lastIdx;
    settings.mvMinM = sliderToMv(0);
    settings.mvMaxM = sliderToMv(lastIdx);
  } else {
    mvMinSlider.min = 0;   mvMinSlider.max = 195; mvMinSlider.step = 5;
    mvMaxSlider.min = 5;   mvMaxSlider.max = 200; mvMaxSlider.step = 5;
    mvMinSlider.value = 10;
    mvMaxSlider.value = 200;
    settings.mvMinM = 10;
    settings.mvMaxM = MV_NO_LIMIT;
  }
  mvMinDisplay.textContent = formatMVLabel(settings.mvMinM);
  mvMaxDisplay.textContent = formatMVLabel(settings.mvMaxM);
  updatePoolSizeInfo();
};

// ── 事件监听：滑块 ───────────────────────────────────────────
// "input" 事件：拖动过程中实时触发；"change" 事件：拖动结束后触发

mvMinSlider.addEventListener("input", () => {
  // 防止最小值超过最大值
  if (Number(mvMinSlider.value) >= Number(mvMaxSlider.value)) {
    mvMinSlider.value = Number(mvMaxSlider.value) - Number(mvMinSlider.step);
  }
  settings.mvMinM = isCslOnlyMode()
    ? sliderToMv(Number(mvMinSlider.value))
    : Number(mvMinSlider.value);
  mvMinDisplay.textContent = formatMVLabel(settings.mvMinM);
  updatePoolSizeInfo();
});

mvMinSlider.addEventListener("change", () => {
  if (players.length) startGame();   // 拖动完成后开始新游戏
});

mvMaxSlider.addEventListener("input", () => {
  if (Number(mvMaxSlider.value) <= Number(mvMinSlider.value)) {
    mvMaxSlider.value = Number(mvMinSlider.value) + Number(mvMaxSlider.step);
  }
  settings.mvMaxM = isCslOnlyMode()
    ? sliderToMv(Number(mvMaxSlider.value))
    : Number(mvMaxSlider.value);
  mvMaxDisplay.textContent = formatMVLabel(settings.mvMaxM);
  updatePoolSizeInfo();
});

mvMaxSlider.addEventListener("change", () => {
  if (players.length) startGame();
});

// ── 事件监听：难度单选按钮 ───────────────────────────────────
// document.querySelectorAll 返回所有匹配的元素，用 forEach 逐一绑定
document.querySelectorAll('input[name="difficulty"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    settings.difficulty = Number(radio.value);
    if (players.length) startGame();
  });
});

// ── 联赛选择器 ───────────────────────────────────────────────
const leagueSelectorEl = document.querySelector("#league-selector");

const updateLeagueSelectorVisibility = () => {
  if (leagueSelectorEl) {
    leagueSelectorEl.style.display = settings.mode === "league" ? "grid" : "none";
  }
};

// 联赛显示顺序和双语名称配置
const LEAGUE_ORDER = [
  { key: "Premier League",      zh: "英超 Premier League",          en: "Premier League" },
  { key: "LaLiga",              zh: "西甲 LaLiga",                   en: "LaLiga" },
  { key: "Bundesliga",          zh: "德甲 Bundesliga",               en: "Bundesliga" },
  { key: "Serie A",             zh: "意甲 Serie A",                  en: "Serie A" },
  { key: "Ligue 1",             zh: "法甲 Ligue 1",                  en: "Ligue 1" },
  { key: "Eredivisie",          zh: "荷甲 Eredivisie",               en: "Eredivisie" },
  { key: "Liga Portugal",       zh: "葡超 Liga Portugal",            en: "Liga Portugal" },
  { key: "Süper Lig",           zh: "土超 Süper Lig",                en: "Süper Lig" },
  { key: "Saudi Pro League",    zh: "沙超 Saudi Pro League",         en: "Saudi Pro League" },
  { key: "Major League Soccer", zh: "美职联 Major League Soccer",    en: "Major League Soccer" },
  { key: "Chinese Super League",zh: "中超 Chinese Super League",     en: "Chinese Super League" },
];

const TOP5_LEAGUES = new Set([
  "Premier League", "LaLiga", "Bundesliga", "Serie A", "Ligue 1"
]);

// 动态构建联赛复选框列表（数据加载后或语言切换后调用）
const buildLeagueSelector = () => {
  if (!leagueSelectorEl) return;
  const available = new Set(players.map((p) => p.league));  // 数据中实际存在的联赛

  const hadSelections = settings.selectedLeagues.size > 0;
  if (!hadSelections) {
    // 默认勾选五大联赛
    settings.selectedLeagues = new Set(
      [...available].filter((l) => TOP5_LEAGUES.has(l))
    );
  }

  // 先按 LEAGUE_ORDER 排序，再把数据中有但列表里没有的联赛附加到后面
  const knownInData = LEAGUE_ORDER.filter((l) => available.has(l.key));
  const unknownInData = [...available]
    .filter((l) => !LEAGUE_ORDER.some((o) => o.key === l))
    .sort()
    .map((l) => ({ key: l, zh: l, en: l }));
  const leagues = [...knownInData, ...unknownInData];

  // 生成复选框 HTML（根据当前语言选择 zh 或 en 显示名）
  leagueSelectorEl.innerHTML = leagues
    .map(
      (l) => `
      <label class="league-option">
        <input type="checkbox" name="league" value="${l.key}" ${settings.selectedLeagues.has(l.key) ? "checked" : ""}>
        <span>${currentLang === 'zh' ? l.zh : l.en}</span>
      </label>`
    )
    .join("");

  // 给每个复选框绑定 change 事件
  leagueSelectorEl.querySelectorAll('input[name="league"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        settings.selectedLeagues.add(cb.value);
      } else {
        settings.selectedLeagues.delete(cb.value);
      }
      updateSliderScale();
      if (players.length) startGame();
    });
  });

  updateLeagueSelectorVisibility();
};

// ── 事件监听：游戏模式单选按钮 ──────────────────────────────
document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    settings.mode = radio.value;
    updateLeagueSelectorVisibility();
    updateSliderScale();
    if (players.length) startGame();
  });
});

// ── 事件监听：语言切换 ───────────────────────────────────────
if (langBtn) {
  langBtn.addEventListener("click", () => {
    setLang(currentLang === 'zh' ? 'en' : 'zh');
    // 切换语言，i18n.js 内部会触发 'langchange' 自定义事件
  });
}

// 监听自定义 'langchange' 事件，语言变化后重新翻译所有文字
document.addEventListener('langchange', () => {
  applyI18n();
});

// ── 事件监听：按钮点击 ───────────────────────────────────────
guessBtn.addEventListener("click", handleGuess);
hintBtn.addEventListener("click", handleHint);
surrenderBtn.addEventListener("click", handleSurrender);
newGameBtn.addEventListener("click", startGame);

// 输入框聚焦时，如果已有内容，显示补全列表
guessInput.addEventListener("focus", () => {
  if (guessInput.value) updateDatalistByKeyword(guessInput.value);
});

// 点击补全框外面时关闭下拉列表
document.addEventListener("click", (e) => {
  if (!e.target.closest(".autocomplete-wrapper")) {
    // .closest()：向上查找最近的匹配祖先元素，找不到返回 null
    closeAutocomplete();
  }
});

// 输入框输入时实时更新补全列表
guessInput.addEventListener("input", (event) => {
  updateDatalistByKeyword(event.target.value);  // event.target：触发事件的元素
});

// 键盘导航：↑↓ 切换高亮项，Enter 确认选择或提交猜测
guessInput.addEventListener("keydown", (event) => {
  const isOpen = autocompleteList.style.display === "block";

  if (event.key === "ArrowDown") {
    event.preventDefault();    // 阻止默认的光标移动行为
    if (isOpen) {
      setActiveIndex(activeIndex + 1);
    }
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (isOpen) {
      setActiveIndex(activeIndex - 1);
    }
    return;
  }

  if (event.key === "Enter") {
    if (isOpen && activeIndex >= 0) {
      const items = autocompleteList.querySelectorAll(".autocomplete-item");
      if (items[activeIndex]) {
        guessInput.value = items[activeIndex].dataset.name;
        closeAutocomplete();
      }
    }
    handleGuess();
  }
});

// 按 Escape 键投降
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    handleSurrender();
  }
});

// 页面加载完成后，启动游戏
initializeGame();

// ═══════════════════════════════════════════════════════════════
//  AUTH（登录/注册）— 使用 Supabase 作为后端身份验证服务
// ═══════════════════════════════════════════════════════════════

// 创建 Supabase 客户端实例（相当于和数据库建立连接）
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;   // 当前登录用户，未登录时为 null

// 获取登录/注册弹窗相关的 DOM 元素
const authModal    = document.querySelector('#auth-modal');
const authBtn      = document.querySelector('#auth-btn');
const authArea     = document.querySelector('#auth-area');
const modalClose   = document.querySelector('#modal-close');
const authForm     = document.querySelector('#auth-form');
const authSubmit   = document.querySelector('#auth-submit');
const authSwitch   = document.querySelector('#auth-switch');
const authError    = document.querySelector('#auth-error');
const authEmailEl  = document.querySelector('#auth-email');
const authPwEl     = document.querySelector('#auth-password');
const authUserEl   = document.querySelector('#auth-username-input');
const usernameGroup = document.querySelector('#username-group');
const authUsernameLabel = document.querySelector('#auth-username');

let authMode = 'login';   // 当前弹窗模式：'login' 或 'register'

// 打开登录/注册弹窗
const openAuthModal = (mode = 'login') => {
  authMode = mode;
  authError.hidden = true;
  authForm.reset();          // 清空表单内容
  const isRegister = mode === 'register';
  usernameGroup.hidden = !isRegister;   // 注册时才显示用户名字段
  document.querySelector('#modal-title').textContent = t(isRegister ? 'auth_register_title' : 'auth_login_title');
  authSwitch.textContent = t(isRegister ? 'auth_switch_to_login' : 'auth_switch_to_register');
  authModal.hidden = false;  // 移除 hidden 属性，弹窗显示
  (isRegister ? authUserEl : authEmailEl).focus();
};

const closeAuthModal = () => { authModal.hidden = true; };

// 显示登录错误信息
const showAuthError = (msg) => {
  authError.textContent = msg;
  authError.hidden = false;
};

// 更新 UI 为"已登录"状态
const setLoggedIn = (user) => {
  currentUser = user;
  authUsernameLabel.textContent = t('auth_logged_in_as', user.username);
  authUsernameLabel.hidden = false;
  authBtn.textContent = t('btn_logout');
  authBtn.dataset.action = 'logout';   // 修改 data-action 属性，下次点击时执行退出
};

// 更新 UI 为"已退出"状态
const setLoggedOut = () => {
  currentUser = null;
  authUsernameLabel.hidden = true;
  authBtn.textContent = t('btn_login');
  authBtn.dataset.action = 'login';
};

// 登录/退出按钮
authBtn.addEventListener('click', () => {
  if (authBtn.dataset.action === 'logout') {
    supabase.auth.signOut();   // 调用 Supabase SDK 的退出方法
  } else {
    openAuthModal('login');
  }
});

// 关闭弹窗
modalClose.addEventListener('click', closeAuthModal);
authModal.addEventListener('click', (e) => {
  if (e.target === authModal) closeAuthModal();  // 点击遮罩层（不是弹窗内部）时关闭
});

// 切换登录/注册模式
authSwitch.addEventListener('click', () => {
  openAuthModal(authMode === 'login' ? 'register' : 'login');
});

// 表单提交（登录或注册）
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();   // 阻止表单默认的页面刷新行为
  const email    = authEmailEl.value.trim();
  const password = authPwEl.value;
  const username = authUserEl.value.trim();

  if (!email || !password || (authMode === 'register' && !username)) {
    showAuthError(t('auth_error_empty'));
    return;
  }

  authSubmit.disabled = true;   // 提交中禁用按钮，防止重复点击

  if (authMode === 'register') {
    // 调用 Supabase 注册 API
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },   // 把用户名存在 user_metadata 里
    });
    if (error) {
      showAuthError(t('auth_error_register', error.message));
    } else {
      closeAuthModal();
      setMessage(t('auth_success_register'), 'ok');
    }
  } else {
    // 调用 Supabase 登录 API（解构赋值获取 data 和 error）
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showAuthError(t('auth_error_login', error.message));
    } else {
      const username = data.user.user_metadata?.username ?? data.user.email.split('@')[0];
      // ?. 可选链：如果 user_metadata 为 null/undefined，不报错，返回 undefined
      // ?? 空值合并：如果左边是 null/undefined，用右边的值（邮箱前缀作为用户名）
      setLoggedIn({ id: data.user.id, email: data.user.email, username });
      closeAuthModal();
    }
  }

  authSubmit.disabled = false;
});

// 页面加载时恢复之前的登录状态（从 Supabase 本地存储中读取 session）
supabase.auth.getSession().then(({ data }) => {
  const user = data.session?.user;
  if (user) {
    const username = user.user_metadata?.username ?? user.email.split('@')[0];
    setLoggedIn({ id: user.id, email: user.email, username });
  }
});

// 监听登录状态变化（退出登录时自动更新 UI）
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    setLoggedOut();
  }
});

// ═══════════════════════════════════════════════════════════════
//  SCORE SUBMISSION（分数提交到后端）
// ═══════════════════════════════════════════════════════════════

const submitScore = async (attempts, won) => {
  if (!currentUser) return;   // 未登录则不提交

  try {
    // 获取当前用户的 JWT token（用于后端验证身份）
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    // 向后端 API 发送 POST 请求提交分数
    await fetch(`${API_BASE}/api/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,   // Bearer token 鉴权
      },
      body: JSON.stringify({   // JSON.stringify：把 JS 对象转成 JSON 字符串
        attempts,
        won,
        mode: settings.mode,
        difficulty: settings.difficulty,
        username: currentUser.username,
      }),
    });

    setMessage(t('score_submitted'), 'ok');
  } catch {
    console.error(t('score_submit_fail'));   // 提交失败不影响游戏继续
  }
};

// ═══════════════════════════════════════════════════════════════
//  LEADERBOARD MODAL（排行榜弹窗）
// ═══════════════════════════════════════════════════════════════

const lbModal      = document.querySelector('#lb-modal');
const lbOpenBtn    = document.querySelector('#lb-open-btn');
const lbModalClose = document.querySelector('#lb-modal-close');
const lbModeEl     = document.querySelector('#lb-mode');      // 模式下拉框
const lbDiffEl     = document.querySelector('#lb-difficulty');// 难度下拉框
const lbBody       = document.querySelector('#leaderboard-body');

const openLeaderboard = () => {
  lbModal.hidden = false;
  loadLeaderboard();
};

const closeLeaderboard = () => { lbModal.hidden = true; };

lbOpenBtn.addEventListener('click', openLeaderboard);
lbModalClose.addEventListener('click', closeLeaderboard);
lbModal.addEventListener('click', (e) => { if (e.target === lbModal) closeLeaderboard(); });

// 从后端加载排行榜数据并渲染
const loadLeaderboard = async () => {
  const mode       = lbModeEl.value;
  const difficulty = lbDiffEl.value;

  lbBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af">Loading...</td></tr>`;

  try {
    // 向后端请求排行榜数据（通过 URL 参数传递筛选条件）
    const res = await fetch(`${API_BASE}/api/leaderboard?mode=${mode}&difficulty=${difficulty}&limit=20`);
    const data = await res.json();

    if (!data.ok || !data.leaderboard.length) {
      lbBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af">${t('leaderboard_empty')}</td></tr>`;
      return;
    }

    // 把排行榜数据渲染为表格行
    lbBody.innerHTML = data.leaderboard
      .map((row, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${row.username}</td>
          <td>${row.attempts}</td>
          <td>${row.won ? t('leaderboard_won') : t('leaderboard_lost')}</td>
          <td>${new Date(row.played_at).toLocaleDateString()}</td>
          <!-- new Date()：把时间戳转为日期对象；.toLocaleDateString()：格式化为本地日期字符串 -->
        </tr>`)
      .join('');
  } catch {
    lbBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af">${t('leaderboard_empty')}</td></tr>`;
  }
};

// 下拉框改变时重新加载排行榜
lbModeEl.addEventListener('change', loadLeaderboard);
lbDiffEl.addEventListener('change', loadLeaderboard);

// ═══════════════════════════════════════════════════════════════
//  DAILY CHALLENGE（每日挑战：全服同一谜底）
// ═══════════════════════════════════════════════════════════════

const startDailyChallenge = async () => {
  setMessageByKey('msg_daily_loading');
  togglePlayState(true);

  try {
    // 从后端获取今天的谜底球员名字
    const res = await fetch(`${API_BASE}/api/daily`);
    const data = await res.json();

    if (!data.ok || !data.player_name) throw new Error('no player');

    // 在本地球员数据中找到对应的球员对象
    const dailyPlayer = players.find((p) => p.name === data.player_name);
    if (!dailyPlayer) throw new Error('player not in local db');

    // 和 startGame() 一样，重置游戏状态，只是 answer 由后端决定
    gameState = resetGameState({
      answer: dailyPlayer,
      difficulty: settings.difficulty
    });
    historyBody.innerHTML = '';
    guessInput.value = '';
    closeAutocomplete();
    maxAttemptsLabel.textContent = String(settings.difficulty);
    updateAttempts();
    togglePlayState(false);
    updateHintBtn();
    setMessageByKey('msg_new_game');
    guessInput.focus();
  } catch {
    setMessageByKey('msg_daily_fail', 'error');
    togglePlayState(true);
  }
};
