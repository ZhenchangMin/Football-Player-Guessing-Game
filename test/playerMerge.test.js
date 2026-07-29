import test from "node:test";
import assert from "node:assert/strict";
import { mergePlayers } from "../src/data/playerMerge.js";

const player = (name, club, marketValueEur) => ({
  name,
  age: 25,
  position: "CM",
  number: 8,
  club,
  league: "Premier League",
  nation: "England",
  marketValueEur
});

test("mergePlayers preserves existing clubs that were not fetched", () => {
  const existing = [
    player("James Maddison", "Tottenham", 35_000_000),
    player("Example Player", "Arsenal", 10_000_000)
  ];
  const fetched = [
    player("Example Player", "Arsenal", 12_000_000)
  ];

  const merged = mergePlayers(existing, fetched);

  assert.equal(merged.length, 2);
  assert.equal(
    merged.find((item) => item.name === "James Maddison")?.club,
    "Tottenham"
  );
  assert.equal(
    merged.find((item) => item.name === "Example Player")?.marketValueEur,
    12_000_000
  );
});

test("mergePlayers leaves the database unchanged when a fetch yields no players", () => {
  const existing = [
    player("James Maddison", "Tottenham", 35_000_000)
  ];

  assert.deepEqual(mergePlayers(existing, []), existing);
});

test("mergePlayers adds newly fetched players", () => {
  const existing = [
    player("James Maddison", "Tottenham", 35_000_000)
  ];
  const newcomer = player("New Player", "Tottenham", 5_000_000);

  const merged = mergePlayers(existing, [newcomer]);

  assert.equal(merged.length, 2);
  assert.deepEqual(
    merged.find((item) => item.name === "New Player"),
    newcomer
  );
});
