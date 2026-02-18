const MAX_ATTEMPTS = 8;
const DATA_URL = "./data/players.real.json";
const REQUIRED_FIELDS = ["name", "age", "position", "number", "club", "league", "nation"];

let players = [];

const guessInput = document.querySelector("#player-guess");
const guessBtn = document.querySelector("#guess-btn");
const newGameBtn = document.querySelector("#new-game-btn");
const attemptsLabel = document.querySelector("#attempts");
const maxAttemptsLabel = document.querySelector("#max-attempts-label");
const messageLabel = document.querySelector("#message");
const historyBody = document.querySelector("#history-body");
const playerList = document.querySelector("#players-list");

let answer = null;
let attemptsLeft = MAX_ATTEMPTS;
let gameOver = false;

const normalize = (value) => String(value).trim().toLowerCase();

const setMessage = (text, tone = "normal") => {
  messageLabel.textContent = text;
  if (tone === "ok") {
    messageLabel.style.color = "#166534";
  } else if (tone === "error") {
    messageLabel.style.color = "#b91c1c";
  } else {
    messageLabel.style.color = "#1f2937";
  }
};

const compareNumber = (guess, target) => {
  if (guess === target) {
    return { className: "correct", hint: "" };
  }
  if (guess > target) {
    return { className: "wrong", hint: '<span class="hint-down">↓ 太大了</span>' };
  }
  return { className: "wrong", hint: '<span class="hint-up">↑ 太小了</span>' };
};

const compareText = (guess, target) =>
  guess === target ? { className: "correct" } : { className: "wrong" };

const createCell = (value, className, hint = "") => `<td class="${className}">${value}${hint}</td>`;

const addHistoryRow = (guessPlayer) => {
  const ageResult = compareNumber(guessPlayer.age, answer.age);
  const numberResult = compareNumber(guessPlayer.number, answer.number);
  const positionResult = compareText(guessPlayer.position, answer.position);
  const clubResult = compareText(guessPlayer.club, answer.club);
  const leagueResult = compareText(guessPlayer.league, answer.league);
  const nationResult = compareText(guessPlayer.nation, answer.nation);

  const tr = document.createElement("tr");
  tr.innerHTML = `
    ${createCell(guessPlayer.name, guessPlayer.name === answer.name ? "correct" : "wrong")}
    ${createCell(guessPlayer.age, ageResult.className, ageResult.hint)}
    ${createCell(guessPlayer.position, positionResult.className)}
    ${createCell(guessPlayer.number, numberResult.className, numberResult.hint)}
    ${createCell(guessPlayer.club, clubResult.className)}
    ${createCell(guessPlayer.league, leagueResult.className)}
    ${createCell(guessPlayer.nation, nationResult.className)}
  `;
  historyBody.prepend(tr);
};

const togglePlayState = (disabled) => {
  guessBtn.disabled = disabled;
  guessInput.disabled = disabled;
};

const endGame = (won) => {
  gameOver = true;
  togglePlayState(true);

  if (won) {
    setMessage(`🎉 恭喜答对！谜底就是 ${answer.name}。`, "ok");
  } else {
    setMessage(`次数用完！本轮谜底是 ${answer.name}。点击“开始新游戏”再来一次。`, "error");
  }
};

const updateAttempts = () => {
  attemptsLabel.textContent = `剩余次数：${attemptsLeft}`;
};

const validatePlayersData = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter((item) => REQUIRED_FIELDS.every((field) => item && Object.hasOwn(item, field)))
    .map((item) => ({
      name: String(item.name).trim(),
      age: Number(item.age),
      position: String(item.position).trim(),
      number: Number(item.number),
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

const loadPlayers = async () => {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`加载数据库失败（HTTP ${response.status}）`);
  }

  const rawData = await response.json();
  const validated = validatePlayersData(rawData);

  if (!validated.length) {
    throw new Error("数据库为空或字段格式不正确");
  }

  players = validated;
};

const startGame = () => {
  if (!players.length) {
    setMessage("数据库未加载完成，请稍后重试。", "error");
    togglePlayState(true);
    return;
  }

  answer = players[Math.floor(Math.random() * players.length)];
  attemptsLeft = MAX_ATTEMPTS;
  gameOver = false;
  historyBody.innerHTML = "";
  guessInput.value = "";
  maxAttemptsLabel.textContent = MAX_ATTEMPTS;
  updateAttempts();
  togglePlayState(false);
  setMessage("新游戏开始！请输入一位球员姓名进行猜测。");
  guessInput.focus();
};

const handleGuess = () => {
  if (gameOver) return;

  const raw = guessInput.value;
  const guessPlayer = players.find((player) => normalize(player.name) === normalize(raw));

  if (!guessPlayer) {
    setMessage("未找到该球员，请从下拉建议中选择或检查拼写。", "error");
    return;
  }

  addHistoryRow(guessPlayer);
  attemptsLeft -= 1;
  updateAttempts();

  if (guessPlayer.name === answer.name) {
    endGame(true);
    return;
  }

  if (attemptsLeft <= 0) {
    endGame(false);
    return;
  }

  setMessage("继续猜！绿色=正确，红色=不匹配，数字会提示高低。", "normal");
  guessInput.select();
};

const populateDatalist = () => {
  const options = players
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((player) => `<option value="${player.name}"></option>`)
    .join("");

  playerList.innerHTML = options;
};

const initializeGame = async () => {
  setMessage("正在加载真实球员数据库...");
  togglePlayState(true);

  try {
    await loadPlayers();
    populateDatalist();
    startGame();
  } catch (error) {
    setMessage(`数据库加载失败：${error.message}`, "error");
    togglePlayState(true);
  }
};

guessBtn.addEventListener("click", handleGuess);
newGameBtn.addEventListener("click", startGame);
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleGuess();
  }
});

initializeGame();
