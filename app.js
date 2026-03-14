const MAX_ATTEMPTS = 8;
const DATA_URL = "./data/players.real.json";
const REQUIRED_FIELDS = ["name", "age", "position", "number", "club", "league", "nation"];
const FRONT_POSITIONS = ["ST", "LW", "RW"];
const MIDFIELD_POSITIONS = ["CAM", "CM", "CDM", "LM", "RM"];
const BACK_POSITIONS = ["CB", "LB", "RB"];
const NATION_TO_CONTINENT = {
  // Africa
  Algeria: "Africa",
  Angola: "Africa",
  Cameroon: "Africa",
  "Cape Verde": "Africa",
  "Congo DR": "Africa",
  Egypt: "Africa",
  Ethiopia: "Africa",
  Gabon: "Africa",
  Gambia: "Africa",
  Ghana: "Africa",
  Guinea: "Africa",
  "Guinea-Bissau": "Africa",
  "Ivory Coast": "Africa",
  Kenya: "Africa",
  Liberia: "Africa",
  Mali: "Africa",
  Mauritania: "Africa",
  Morocco: "Africa",
  Mozambique: "Africa",
  Nigeria: "Africa",
  Senegal: "Africa",
  "Sierra Leone": "Africa",
  "South Africa": "Africa",
  Sudan: "Africa",
  Tanzania: "Africa",
  Togo: "Africa",
  Tunisia: "Africa",
  Uganda: "Africa",
  Zambia: "Africa",
  Zimbabwe: "Africa",

  // Asia
  China: "Asia",
  Japan: "Asia",
  "South Korea": "Asia",
  Iraq: "Asia",
  Iran: "Asia",
  Israel: "Asia",
  Jordan: "Asia",
  Lebanon: "Asia",
  Qatar: "Asia",
  "Saudi Arabia": "Asia",
  Syria: "Asia",
  Thailand: "Asia",
  Uzbekistan: "Asia",

  // Europe
  Albania: "Europe",
  Andorra: "Europe",
  Armenia: "Europe",
  Austria: "Europe",
  Azerbaijan: "Europe",
  Belarus: "Europe",
  Belgium: "Europe",
  "Bosnia-Herzegovina": "Europe",
  Bulgaria: "Europe",
  Croatia: "Europe",
  Cyprus: "Europe",
  "Czech Republic": "Europe",
  Denmark: "Europe",
  England: "Europe",
  Estonia: "Europe",
  "Faroe Islands": "Europe",
  Finland: "Europe",
  France: "Europe",
  Georgia: "Europe",
  Germany: "Europe",
  Greece: "Europe",
  Hungary: "Europe",
  Iceland: "Europe",
  Ireland: "Europe",
  Italy: "Europe",
  Kazakhstan: "Europe",
  Kosovo: "Europe",
  Latvia: "Europe",
  Lithuania: "Europe",
  Luxembourg: "Europe",
  Malta: "Europe",
  Moldova: "Europe",
  Montenegro: "Europe",
  Netherlands: "Europe",
  "North Macedonia": "Europe",
  "Northern Ireland": "Europe",
  Norway: "Europe",
  Poland: "Europe",
  Portugal: "Europe",
  Romania: "Europe",
  Russia: "Europe",
  Scotland: "Europe",
  Serbia: "Europe",
  Slovakia: "Europe",
  Slovenia: "Europe",
  Spain: "Europe",
  Sweden: "Europe",
  Switzerland: "Europe",
  Turkey: "Europe",
  Ukraine: "Europe",
  Wales: "Europe",

  // North/Central America & Caribbean
  Canada: "North America",
  "Costa Rica": "North America",
  Cuba: "North America",
  "Dominican Republic": "North America",
  "El Salvador": "North America",
  Guatemala: "North America",
  Haiti: "North America",
  Honduras: "North America",
  Jamaica: "North America",
  Mexico: "North America",
  Panama: "North America",
  "Trinidad and Tobago": "North America",
  "United States": "North America",

  // South America
  Argentina: "South America",
  Bolivia: "South America",
  Brazil: "South America",
  Chile: "South America",
  Colombia: "South America",
  Ecuador: "South America",
  Paraguay: "South America",
  Peru: "South America",
  Uruguay: "South America",
  Venezuela: "South America",

  // Oceania
  Australia: "Oceania",
  "New Zealand": "Oceania"
};

let players = [];

const MV_NO_LIMIT = 200;

const settings = {
  difficulty: 8,
  mvMinM: 10,
  mvMaxM: MV_NO_LIMIT,
  mode: "all",
  selectedLeagues: new Set()
};

const getActivePlayers = () => {
  let pool = players;

  if (settings.mode === "top250" || settings.mode === "top500") {
    const topN = settings.mode === "top250" ? 250 : 500;
    pool = [...players]
      .filter((p) => Number.isFinite(p.marketValueEur))
      .sort((a, b) => b.marketValueEur - a.marketValueEur)
      .slice(0, topN);
  } else if (settings.mode === "league") {
    pool = settings.selectedLeagues.size > 0
      ? players.filter((p) => settings.selectedLeagues.has(p.league))
      : [];
  }

  const minEur = settings.mvMinM * 1_000_000;
  const noMax = settings.mvMaxM >= MV_NO_LIMIT;
  const maxEur = settings.mvMaxM * 1_000_000;

  return pool.filter((p) => {
    if (!Number.isFinite(p.marketValueEur)) {
      return settings.mvMinM === 0 && noMax;
    }
    if (p.marketValueEur < minEur) return false;
    if (!noMax && p.marketValueEur > maxEur) return false;
    return true;
  });
};

const formatMVLabel = (valueM) => {
  if (valueM >= MV_NO_LIMIT) return "不限";
  if (valueM === 0) return "€0";
  return `€${valueM}M`;
};

const updatePoolSizeInfo = () => {
  const el = document.querySelector("#pool-size-info");
  if (!el || !players.length) return;
  const count = getActivePlayers().length;
  el.textContent = `当前设置下共 ${count} 位球员可参与游戏`;
};

const guessInput = document.querySelector("#player-guess");
const guessBtn = document.querySelector("#guess-btn");
const surrenderBtn = document.querySelector("#surrender-btn");
const newGameBtn = document.querySelector("#new-game-btn");
const attemptsLabel = document.querySelector("#attempts");
const maxAttemptsLabel = document.querySelector("#max-attempts-label");
const messageLabel = document.querySelector("#message");
const historyBody = document.querySelector("#history-body");
const autocompleteList = document.querySelector("#autocomplete-list");

let answer = null;
let attemptsLeft = MAX_ATTEMPTS;
let gameOver = false;

const normalize = (value) => String(value).trim().toLowerCase();

// Strip diacritics so "e" matches "é/è/ê", "o" matches "ö", etc.
const normalizeSearch = (value) =>
  normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

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

const getPositionLine = (position) => {
  const upper = String(position).trim().toUpperCase();
  if (upper === "GK") return "goalkeeper";
  if (FRONT_POSITIONS.includes(upper)) return "front";
  if (MIDFIELD_POSITIONS.includes(upper)) return "midfield";
  if (BACK_POSITIONS.includes(upper)) return "back";
  return null;
};

const isSameContinentNation = (guessNation, targetNation) => {
  const guessContinent = NATION_TO_CONTINENT[String(guessNation).trim()];
  const targetContinent = NATION_TO_CONTINENT[String(targetNation).trim()];
  return Boolean(guessContinent && targetContinent && guessContinent === targetContinent);
};

const compareNumber = (guess, target) => {
  if (guess === target) {
    return { className: "correct", hint: "" };
  }

  if (Math.abs(guess - target) === 1) {
    if (guess > target) {
      return { className: "partial", hint: '<span class="hint-down">↓ 很接近</span>' };
    }
    return { className: "partial", hint: '<span class="hint-up">↑ 很接近</span>' };
  }

  if (guess > target) {
    return { className: "wrong", hint: '<span class="hint-down">↓ 偏大</span>' };
  }
  return { className: "wrong", hint: '<span class="hint-up">↑ 偏小</span>' };
};

const compareText = (guess, target) =>
  guess === target ? { className: "correct" } : { className: "wrong" };

const comparePosition = (guess, target) => {
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

const compareNation = (guess, target) => {
  if (guess === target) {
    return { className: "correct" };
  }

  if (isSameContinentNation(guess, target)) {
    return { className: "partial" };
  }

  return { className: "wrong" };
};

const formatMarketValue = (valueEur) => {
  if (!Number.isFinite(valueEur)) return "-";
  if (valueEur >= 1_000_000_000) return `€${(valueEur / 1_000_000_000).toFixed(2)}B`;
  if (valueEur >= 1_000_000) return `€${(valueEur / 1_000_000).toFixed(1)}M`;
  if (valueEur >= 1_000) return `€${(valueEur / 1_000).toFixed(1)}K`;
  return `€${valueEur}`;
};

const compareMarketValue = (guess, target) => {
  if (!Number.isFinite(guess) || !Number.isFinite(target)) {
    return { className: "wrong", hint: "" };
  }

  if (guess === target) {
    return { className: "correct", hint: "" };
  }

  const delta = Math.abs(guess - target);
  const threshold = Math.max(target * 0.15, 2_000_000);

  if (delta <= threshold) {
    if (guess > target) {
      return { className: "partial", hint: '<span class="hint-down">↓ 很接近</span>' };
    }
    return { className: "partial", hint: '<span class="hint-up">↑ 很接近</span>' };
  }

  if (guess > target) {
    return { className: "wrong", hint: '<span class="hint-down">↓ 偏高</span>' };
  }

  return { className: "wrong", hint: '<span class="hint-up">↑ 偏低</span>' };
};

const createCell = (value, className, hint = "") => `<td class="${className}">${value}${hint}</td>`;

const addHistoryRow = (guessPlayer) => {
  const ageResult = compareNumber(guessPlayer.age, answer.age);
  const numberResult = compareNumber(guessPlayer.number, answer.number);
  const marketValueResult = compareMarketValue(guessPlayer.marketValueEur, answer.marketValueEur);
  const positionResult = comparePosition(guessPlayer.position, answer.position);
  const clubResult = compareText(guessPlayer.club, answer.club);
  const leagueResult = compareText(guessPlayer.league, answer.league);
  const nationResult = compareNation(guessPlayer.nation, answer.nation);

  const tr = document.createElement("tr");
  tr.innerHTML = `
    ${createCell(guessPlayer.name, guessPlayer.name === answer.name ? "correct" : "wrong")}
    ${createCell(guessPlayer.age, ageResult.className, ageResult.hint)}
    ${createCell(guessPlayer.position, positionResult.className)}
    ${createCell(guessPlayer.number, numberResult.className, numberResult.hint)}
    ${createCell(formatMarketValue(guessPlayer.marketValueEur), marketValueResult.className, marketValueResult.hint)}
    ${createCell(guessPlayer.club, clubResult.className)}
    ${createCell(guessPlayer.league, leagueResult.className)}
    ${createCell(guessPlayer.nation, nationResult.className)}
  `;
  historyBody.prepend(tr);
};

const addAnswerRow = () => {
  const tr = document.createElement("tr");
  tr.className = "answer-row";
  tr.innerHTML = `
    <td class="answer-label-cell"><span class="answer-tag">谜底</span>${answer.name}</td>
    <td>${answer.age}</td>
    <td>${answer.position}</td>
    <td>${answer.number}</td>
    <td>${formatMarketValue(answer.marketValueEur)}</td>
    <td>${answer.club}</td>
    <td>${answer.league}</td>
    <td>${answer.nation}</td>
  `;
  historyBody.prepend(tr);
};

const togglePlayState = (disabled) => {
  guessBtn.disabled = disabled;
  guessInput.disabled = disabled;
  surrenderBtn.disabled = disabled;
  newGameBtn.disabled = false;
};

const endGame = (won) => {
  gameOver = true;
  togglePlayState(true);

  if (won) {
    setMessage(`恭喜答对！谜底就是 ${answer.name}。`, "ok");
  } else {
    addAnswerRow();
    setMessage(`次数用完！本轮谜底是 ${answer.name}。点击"开始新游戏"再来一次。`, "error");
  }
};

const handleSurrender = () => {
  if (gameOver || !answer) return;
  attemptsLeft = 0;
  updateAttempts();
  gameOver = true;
  togglePlayState(true);
  addAnswerRow();
  setMessage(`你已投降！本轮谜底是 ${answer.name}。点击"开始新游戏"开下一把。`, "error");
};

const updateAttempts = () => {
  attemptsLabel.textContent = `剩余次数：${attemptsLeft}`;
};

const validatePlayersData = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter((item) =>
      REQUIRED_FIELDS.every(
        (field) => item && Object.prototype.hasOwnProperty.call(item, field)
      )
    )
    .map((item) => ({
      name: String(item.name).trim(),
      age: Number(item.age),
      position: String(item.position).trim(),
      number: Number(item.number),
      marketValueEur: Number.isFinite(Number(item.marketValueEur))
        ? Number(item.marketValueEur)
        : null,
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

  const pool = getActivePlayers();
  if (!pool.length) {
    if (settings.mode === "league" && settings.selectedLeagues.size === 0) {
      setMessage("请在设置中至少勾选一个联赛。", "error");
    } else {
      setMessage("当前设置下没有符合条件的球员，请调整身价范围或模式。", "error");
    }
    return;
  }

  answer = pool[Math.floor(Math.random() * pool.length)];
  attemptsLeft = settings.difficulty;
  gameOver = false;
  historyBody.innerHTML = "";
  guessInput.value = "";
  closeAutocomplete();
  maxAttemptsLabel.textContent = String(settings.difficulty);
  updateAttempts();
  togglePlayState(false);
  setMessage("新游戏开始！请输入一位球员姓名进行猜测。");
  guessInput.focus();
};

const handleGuess = () => {
  if (gameOver) return;

  const raw = guessInput.value;
  const guessPlayer = players.find((player) => normalizeSearch(player.name) === normalizeSearch(raw));

  if (!guessPlayer) {
    setMessage("未找到该球员，请从下拉建议中选择或检查拼写。", "error");
    return;
  }

  addHistoryRow(guessPlayer);
  guessInput.value = "";
  closeAutocomplete();
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

  setMessage("继续猜！绿色=完全正确，黄色=接近，红色=不匹配。", "normal");
};

const closeAutocomplete = () => {
  autocompleteList.innerHTML = "";
  autocompleteList.style.display = "none";
};

const updateDatalistByKeyword = (keyword) => {
  const term = normalizeSearch(keyword);
  if (!term) {
    closeAutocomplete();
    return;
  }

  const matchedPlayers = getActivePlayers()
    .filter((player) => normalizeSearch(player.name).includes(term))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 50);

  if (!matchedPlayers.length) {
    closeAutocomplete();
    return;
  }

  autocompleteList.innerHTML = matchedPlayers
    .map((player) => `<div class="autocomplete-item" data-name="${player.name}">${player.name}</div>`)
    .join("");
  autocompleteList.style.display = "block";

  autocompleteList.querySelectorAll(".autocomplete-item").forEach((item) => {
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      guessInput.value = item.dataset.name;
      closeAutocomplete();
    });
  });
};

const initializeGame = async () => {
  setMessage("正在加载真实球员数据库...");
  togglePlayState(true);

  try {
    await loadPlayers();
    buildLeagueSelector();
    updatePoolSizeInfo();
    startGame();
  } catch (error) {
    setMessage(`数据库加载失败：${error.message}`, "error");
    togglePlayState(true);
  }
};

const mvMinSlider = document.querySelector("#mv-min");
const mvMaxSlider = document.querySelector("#mv-max");
const mvMinDisplay = document.querySelector("#mv-min-display");
const mvMaxDisplay = document.querySelector("#mv-max-display");

mvMinSlider.addEventListener("input", () => {
  if (Number(mvMinSlider.value) >= Number(mvMaxSlider.value)) {
    mvMinSlider.value = Number(mvMaxSlider.value) - 5;
  }
  settings.mvMinM = Number(mvMinSlider.value);
  mvMinDisplay.textContent = formatMVLabel(settings.mvMinM);
  updatePoolSizeInfo();
});

mvMinSlider.addEventListener("change", () => {
  if (players.length) startGame();
});

mvMaxSlider.addEventListener("input", () => {
  if (Number(mvMaxSlider.value) <= Number(mvMinSlider.value)) {
    mvMaxSlider.value = Number(mvMinSlider.value) + 5;
  }
  settings.mvMaxM = Number(mvMaxSlider.value);
  mvMaxDisplay.textContent = formatMVLabel(settings.mvMaxM);
  updatePoolSizeInfo();
});

mvMaxSlider.addEventListener("change", () => {
  if (players.length) startGame();
});

document.querySelectorAll('input[name="difficulty"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    settings.difficulty = Number(radio.value);
    if (players.length) startGame();
  });
});

const leagueSelectorEl = document.querySelector("#league-selector");

const updateLeagueSelectorVisibility = () => {
  if (leagueSelectorEl) {
    leagueSelectorEl.style.display = settings.mode === "league" ? "grid" : "none";
  }
};

// Fixed display order and Chinese labels; only leagues present in data are shown
const LEAGUE_ORDER = [
  { key: "Premier League", label: "英超 Premier League" },
  { key: "LaLiga",         label: "西甲 LaLiga" },
  { key: "Bundesliga",     label: "德甲 Bundesliga" },
  { key: "Serie A",        label: "意甲 Serie A" },
  { key: "Ligue 1",        label: "法甲 Ligue 1" },
  { key: "Eredivisie",     label: "荷甲 Eredivisie" },
  { key: "Liga Portugal",  label: "葡超 Liga Portugal" },
  { key: "Süper Lig",      label: "土超 Süper Lig" },
  { key: "Saudi Pro League", label: "沙超 Saudi Pro League" },
  { key: "Major League Soccer", label: "美职联 Major League Soccer" }
];

const TOP5_LEAGUES = new Set([
  "Premier League", "LaLiga", "Bundesliga", "Serie A", "Ligue 1"
]);

const buildLeagueSelector = () => {
  if (!leagueSelectorEl) return;
  const available = new Set(players.map((p) => p.league));

  // Default: only top-5 selected; others unchecked
  settings.selectedLeagues = new Set(
    [...available].filter((l) => TOP5_LEAGUES.has(l))
  );

  // Ordered list: known leagues first (in defined order), then any unknown ones
  const knownInData = LEAGUE_ORDER.filter((l) => available.has(l.key));
  const unknownInData = [...available]
    .filter((l) => !LEAGUE_ORDER.some((o) => o.key === l))
    .sort()
    .map((l) => ({ key: l, label: l }));
  const leagues = [...knownInData, ...unknownInData];

  leagueSelectorEl.innerHTML = leagues
    .map(
      ({ key, label }) => `
      <label class="league-option">
        <input type="checkbox" name="league" value="${key}" ${settings.selectedLeagues.has(key) ? "checked" : ""}>
        <span>${label}</span>
      </label>`
    )
    .join("");

  leagueSelectorEl.querySelectorAll('input[name="league"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        settings.selectedLeagues.add(cb.value);
      } else {
        settings.selectedLeagues.delete(cb.value);
      }
      updatePoolSizeInfo();
      if (players.length) startGame();
    });
  });

  updateLeagueSelectorVisibility();
};

document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    settings.mode = radio.value;
    updateLeagueSelectorVisibility();
    updatePoolSizeInfo();
    if (players.length) startGame();
  });
});

guessBtn.addEventListener("click", handleGuess);
surrenderBtn.addEventListener("click", handleSurrender);
newGameBtn.addEventListener("click", startGame);
guessInput.addEventListener("focus", () => {
  if (guessInput.value) updateDatalistByKeyword(guessInput.value);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".autocomplete-wrapper")) {
    closeAutocomplete();
  }
});
guessInput.addEventListener("input", (event) => {
  updateDatalistByKeyword(event.target.value);
});
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleGuess();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    handleSurrender();
  }
});

initializeGame();
