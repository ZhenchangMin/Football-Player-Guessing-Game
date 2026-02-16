const MAX_ATTEMPTS = 8;

const players = [
  { name: "Erling Haaland", age: 24, position: "ST", number: 9, club: "Manchester City", league: "Premier League", nation: "Norway" },
  { name: "Kylian Mbappe", age: 25, position: "ST", number: 9, club: "Real Madrid", league: "LaLiga", nation: "France" },
  { name: "Jude Bellingham", age: 21, position: "CM", number: 5, club: "Real Madrid", league: "LaLiga", nation: "England" },
  { name: "Harry Kane", age: 31, position: "ST", number: 9, club: "Bayern Munich", league: "Bundesliga", nation: "England" },
  { name: "Florian Wirtz", age: 21, position: "AM", number: 10, club: "Bayer Leverkusen", league: "Bundesliga", nation: "Germany" },
  { name: "Jamal Musiala", age: 21, position: "AM", number: 42, club: "Bayern Munich", league: "Bundesliga", nation: "Germany" },
  { name: "Vinicius Junior", age: 24, position: "LW", number: 7, club: "Real Madrid", league: "LaLiga", nation: "Brazil" },
  { name: "Rodri", age: 28, position: "DM", number: 16, club: "Manchester City", league: "Premier League", nation: "Spain" },
  { name: "Kevin De Bruyne", age: 33, position: "CM", number: 17, club: "Manchester City", league: "Premier League", nation: "Belgium" },
  { name: "Lamine Yamal", age: 17, position: "RW", number: 27, club: "Barcelona", league: "LaLiga", nation: "Spain" },
  { name: "Robert Lewandowski", age: 36, position: "ST", number: 9, club: "Barcelona", league: "LaLiga", nation: "Poland" },
  { name: "Mohamed Salah", age: 32, position: "RW", number: 11, club: "Liverpool", league: "Premier League", nation: "Egypt" },
  { name: "Bukayo Saka", age: 23, position: "RW", number: 7, club: "Arsenal", league: "Premier League", nation: "England" },
  { name: "Martin Odegaard", age: 25, position: "AM", number: 8, club: "Arsenal", league: "Premier League", nation: "Norway" },
  { name: "Lautaro Martinez", age: 27, position: "ST", number: 10, club: "Inter", league: "Serie A", nation: "Argentina" },
  { name: "Rafael Leao", age: 25, position: "LW", number: 10, club: "AC Milan", league: "Serie A", nation: "Portugal" },
  { name: "Victor Osimhen", age: 25, position: "ST", number: 9, club: "Galatasaray", league: "Super Lig", nation: "Nigeria" },
  { name: "Khvicha Kvaratskhelia", age: 23, position: "LW", number: 77, club: "Napoli", league: "Serie A", nation: "Georgia" },
  { name: "Ousmane Dembele", age: 27, position: "RW", number: 10, club: "Paris Saint-Germain", league: "Ligue 1", nation: "France" },
  { name: "Warren Zaire-Emery", age: 18, position: "CM", number: 33, club: "Paris Saint-Germain", league: "Ligue 1", nation: "France" }
];

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

const normalize = (value) => value.trim().toLowerCase();

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

const startGame = () => {
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

guessBtn.addEventListener("click", handleGuess);
newGameBtn.addEventListener("click", startGame);
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleGuess();
  }
});

populateDatalist();
startGame();
