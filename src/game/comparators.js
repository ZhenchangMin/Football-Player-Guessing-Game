import { t } from "../../i18n.js";

// 按位置线分组（用于判断位置是否"接近"）
const FRONT_POSITIONS = ["ST", "LW", "RW"];          // 前锋线
const MIDFIELD_POSITIONS = ["CAM", "CM", "CDM", "LM", "RM"]; // 中场线
const BACK_POSITIONS = ["CB", "LB", "RB"];           // 后卫线

// 比较文字（俱乐部/联赛）：只有完全相同才绿
export const compareText = (guess, target) => {
  if (guess == null || target == null) {
    return { className: "wrong" };
  }
  return guess === target ? { className: "correct" } : { className: "wrong" };
};

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
  if (guess == null || target == null) {
    return { className: "wrong" };
  }

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

// 国家 → 洲，用于判断两个国籍是否属于同一洲。
const NATION_TO_CONTINENT = {
  // Africa
  Algeria: "Africa",
  Angola: "Africa",
  Benin: "Africa",
  "Burkina Faso": "Africa",
  Burundi: "Africa",
  Cameroon: "Africa",
  "Cape Verde": "Africa",
  "Central African Republic": "Africa",
  Chad: "Africa",
  Comoros: "Africa",
  Congo: "Africa",
  "Congo DR": "Africa",
  "DR Congo": "Africa",
  Egypt: "Africa",
  "Equatorial Guinea": "Africa",
  Ethiopia: "Africa",
  Gabon: "Africa",
  Gambia: "Africa",
  "The Gambia": "Africa",
  Ghana: "Africa",
  Guinea: "Africa",
  "Guinea-Bissau": "Africa",
  "Ivory Coast": "Africa",
  "Cote d'Ivoire": "Africa",
  Kenya: "Africa",
  Liberia: "Africa",
  Libya: "Africa",
  Mali: "Africa",
  Mauritania: "Africa",
  Morocco: "Africa",
  Mozambique: "Africa",
  Niger: "Africa",
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
  "Chinese Taipei": "Asia",
  Hongkong: "Asia",
  Indonesia: "Asia",
  Japan: "Asia",
  "Korea, South": "Asia",
  "South Korea": "Asia",
  Iraq: "Asia",
  Iran: "Asia",
  Israel: "Asia",
  Jordan: "Asia",
  Lebanon: "Asia",
  Malaysia: "Asia",
  Palestine: "Asia",
  Qatar: "Asia",
  "Saudi Arabia": "Asia",
  Syria: "Asia",
  Thailand: "Asia",
  Uzbekistan: "Asia",
  Yemen: "Asia",

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
  "Türkiye": "Europe",
  Ukraine: "Europe",
  Wales: "Europe",

  // North/Central America & Caribbean
  Canada: "North America",
  "Costa Rica": "North America",
  Cuba: "North America",
  Curacao: "North America",
  "Dominican Republic": "North America",
  "El Salvador": "North America",
  Guadeloupe: "North America",
  Guatemala: "North America",
  Haiti: "North America",
  Honduras: "North America",
  Jamaica: "North America",
  Mexico: "North America",
  Panama: "North America",
  "Puerto Rico": "North America",
  "St. Vincent & Grenadinen": "North America",
  "Trinidad and Tobago": "North America",
  "United States": "North America",

  // South America
  Argentina: "South America",
  Bolivia: "South America",
  Brazil: "South America",
  Chile: "South America",
  Colombia: "South America",
  Ecuador: "South America",
  "French Guiana": "South America",
  Guyana: "South America",
  Paraguay: "South America",
  Peru: "South America",
  Suriname: "South America",
  Uruguay: "South America",
  Venezuela: "South America",

  // Oceania
  Australia: "Oceania",
  "New Caledonia": "Oceania",
  "New Zealand": "Oceania"
};

// 判断两个国籍是否在同一洲。
const isSameContinentNation = (guessNation, targetNation) => {
  const guessContinent = NATION_TO_CONTINENT[String(guessNation).trim()];
  const targetContinent = NATION_TO_CONTINENT[String(targetNation).trim()];
  return Boolean(guessContinent && targetContinent && guessContinent === targetContinent);
};

// 比较数字（年龄/号码）：相同→绿，差 1→黄，其他→红并显示方向。
export const compareNumber = (guess, target) => {
  if (!Number.isFinite(guess) || !Number.isFinite(target)) {
    return { className: "wrong", hint: "" };
  }

  if (guess === target) {
    return { className: "correct", hint: "" };
  }

  if (Math.abs(guess - target) === 1) {
    if (guess > target) {
      return { className: "partial", hint: `<span class="hint-down">${t("hint_very_close_down")}</span>` };
    }
    return { className: "partial", hint: `<span class="hint-up">${t("hint_very_close_up")}</span>` };
  }

  if (guess > target) {
    return { className: "wrong", hint: `<span class="hint-down">${t("hint_too_high")}</span>` };
  }
  return { className: "wrong", hint: `<span class="hint-up">${t("hint_too_low")}</span>` };
};

// 比较国籍：相同→绿，同洲→黄，其他→红。
export const compareNation = (guess, target) => {
  if (guess == null || target == null) {
    return { className: "wrong" };
  }

  if (guess === target) {
    return { className: "correct" };
  }

  if (isSameContinentNation(guess, target)) {
    return { className: "partial" };
  }

  return { className: "wrong" };
};

// 比较身价：相同→绿，差距在 15%（最低 200 万欧元）以内→黄，其他→红。
export const compareMarketValue = (guess, target) => {
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
      return { className: "partial", hint: `<span class="hint-down">${t("hint_very_close_down")}</span>` };
    }
    return { className: "partial", hint: `<span class="hint-up">${t("hint_very_close_up")}</span>` };
  }

  if (guess > target) {
    return { className: "wrong", hint: `<span class="hint-down">${t("hint_mv_too_high")}</span>` };
  }

  return { className: "wrong", hint: `<span class="hint-up">${t("hint_mv_too_low")}</span>` };
};
