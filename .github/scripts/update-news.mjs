// Fetches recent headlines for each topic from Google News RSS and writes news.json.
// Run daily by .github/workflows/update-news.yml.
import { readFileSync, writeFileSync } from "node:fs";

const topics = [
  { tag: "5G", q: "5G network Australia" },
  { tag: "4G", q: "4G LTE mobile network" },
  { tag: "Optical fibre", q: "optical fibre network telecom" },
  { tag: "DWDM", q: "DWDM optical transport network" },
  { tag: "Innovation", q: '(telecommunications OR "optical networking" OR 6G OR "optical fibre") (breakthrough OR "world first" OR innovation OR unveils OR record)', max: 10 },
];
const MAX_AGE_DAYS = 14;
const PER_TOPIC = 6;
// A headline must mention something telecom-related, so off-topic search hits are dropped.
const RELEVANT = /\b(5g|4g|6g|lte|fib(re|er)s?|optical|optic|dwdm|wdm|wavelength|nbn|broadband|telecom\w*|telco\w*|spectrum|mobile|network\w*|telstra|optus|vodafone|tpg|superloop|subsea|submarine|coherent|transceiver\w*|backhaul|cell sites?|towers?)\b/i;

const decode = (s) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

const pick = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1]) : "";
};

async function fetchTopic({ tag, q, max = PER_TOPIC }) {
  const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(`${q} when:${MAX_AGE_DAYS}d`) +
    "&hl=en-AU&gl=AU&ceid=AU:en";
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (vench news updater)" } });
  if (!res.ok) throw new Error(`${tag}: HTTP ${res.status}`);
  const xml = await res.text();
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const seen = new Set();
  const out = [];
  for (const block of xml.split("<item>").slice(1)) {
    let title = pick(block, "title");
    const source = pick(block, "source");
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    const link = pick(block, "link");
    const date = new Date(pick(block, "pubDate"));
    if (!title || !link || isNaN(date) || date.getTime() < cutoff || !RELEVANT.test(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ topic: tag, title, source, link, date: date.toISOString() });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, max);
}

let previous = [];
try { previous = JSON.parse(readFileSync("news.json", "utf8")).items || []; } catch {}

const items = [];
let failures = 0;
for (const t of topics) {
  try {
    items.push(...(await fetchTopic(t)));
  } catch (err) {
    failures++;
    console.error(err.message);
    items.push(...previous.filter((i) => i.topic === t.tag)); // keep yesterday's items for this topic
  }
}
if (failures === topics.length) {
  console.error("All topics failed; leaving news.json unchanged.");
  process.exit(1);
}
writeFileSync("news.json", JSON.stringify({ updated: new Date().toISOString(), items }, null, 1) + "\n");
console.log(`Wrote ${items.length} items.`);
