// Reads the Fair Work Ombudsman public holiday pages and writes holidays.json.
// Run daily by .github/workflows/update-holidays.yml. Only writes when the data changed.
import { readFileSync, writeFileSync } from "node:fs";

const STATES = {
  "Australian Capital Territory": "ACT", "New South Wales": "NSW", "Northern Territory": "NT", "Queensland": "QLD",
  "South Australia": "SA", "Tasmania": "TAS", "Victoria": "VIC", "Western Australia": "WA",
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ITEM = new RegExp("^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) (\\d{1,2}) (" + MONTHS.join("|") + ")\\s*:\\s*(.+)$");
const TBC = /^Subject to AFL schedule \(date TBC\)\s*:\s*(.+)$/i;
const PART = /from \d|area only|only observed|public service only|areas of the state/i;

export function htmlToText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|li|h[1-6]|div|tr|section|article)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#8217;|&rsquo;/g, "'").replace(/&#8211;|&ndash;/g, "-");
}

export function parseHolidays(text, year) {
  const byDate = new Map();
  let state = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/ /g, " ").replace(/[‘’]/g, "'").trim();
    if (STATES[line]) { state = STATES[line]; continue; }
    if (!state) continue;
    let date, name, tbc = false;
    const m = line.match(ITEM);
    const t = line.match(TBC);
    if (m) {
      date = `${year}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
      name = m[3].trim();
    } else if (t) {
      date = `${year}-09-24`; // sort position only: the AFL Grand Final week, late September
      name = t[1].trim(); tbc = true;
    } else continue;
    let note = "";
    const p = name.match(/^(.*?)\s*\((.+)\)\s*$/);
    if (p) { name = p[1].trim(); note = p[2].trim(); }
    if (/easter saturday|day after good friday|saturday before easter sunday/i.test(name)) name = "Easter Saturday";
    const part = PART.test(note);
    if (!byDate.has(date)) byDate.set(date, { tbc, items: [] });
    byDate.get(date).items.push({ state, name, note, part });
  }
  const rows = [];
  for (const [d, { tbc, items }] of byDate) {
    const names = new Map();
    for (const it of items) {
      const k = it.name.toLowerCase();
      if (!names.has(k)) names.set(k, { display: it.name, states: new Set() });
      names.get(k).states.add(it.state);
    }
    const list = [...names.values()];
    const n = list.length === 1 ? list[0].display :
      list.map((x) => (x.states.size === 8 ? x.display : `${x.display} (${[...x.states].sort().join(", ")})`)).join(" · ");
    const per = {};
    for (const it of items) per[it.state] = per[it.state] === "full" ? "full" : it.part ? "part" : "full";
    const s = Object.keys(per).sort().map((c) => (per[c] === "part" ? c + "~" : c)).join(" ");
    const note = [...new Set(items.map((i) => i.note).filter(Boolean))].join("; ");
    rows.push({ d, n, s, ...(note ? { note } : {}), ...(tbc ? { tbc: true } : {}) });
  }
  return rows.sort((a, b) => a.d.localeCompare(b.d));
}

async function main() {
  let previous = { years: {} };
  try { previous = JSON.parse(readFileSync("holidays.json", "utf8")); } catch {}
  const thisYear = Number(new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", year: "numeric" }));
  const years = {};
  let failures = 0;
  for (const y of [thisYear, thisYear + 1]) {
    const old = previous.years?.[y];
    try {
      const res = await fetch(`https://www.fairwork.gov.au/employment-conditions/public-holidays/${y}-public-holidays`, {
        headers: { "User-Agent": "Mozilla/5.0 (vench holiday updater)" }, signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = parseHolidays(htmlToText(await res.text()), y);
      if (rows.length < 20) throw new Error(`only ${rows.length} rows parsed`);
      if (old && rows.length < old.length * 0.6) throw new Error(`parsed ${rows.length} rows vs ${old.length} before; page layout may have changed`);
      years[y] = rows;
    } catch (err) {
      failures++;
      console.error(`${y}: ${err.message}`);
      if (old) years[y] = old; // keep the last good data
    }
  }
  if (!Object.keys(years).length) { console.error("No holiday data available."); process.exit(1); }
  const unchanged = JSON.stringify(years) === JSON.stringify(previous.years);
  if (failures) process.exitCode = 1; // show the run as failed so a blocked or changed source is noticed
  if (unchanged) { console.log("No changes."); return; }
  writeFileSync("holidays.json", JSON.stringify({ updated: new Date().toISOString(), source: "Fair Work Ombudsman", years }, null, 1) + "\n");
  console.log("holidays.json updated.");
}

if (process.argv[1] && process.argv[1].endsWith("update-holidays.mjs")) await main();
