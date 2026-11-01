// Refreshes data/occupations.json, data/fees.json and data/processing.json from Home Affairs.
// Run daily by .github/workflows/update-visa-data.yml. Each file is only replaced when its data changed
// and passes a sanity check; otherwise the last good copy stays in place.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const HA = "https://immi.homeaffairs.gov.au";
const UA = "Mozilla/5.0 (vench visa data updater)";

async function post(path, body) {
  const r = await fetch(HA + path, {
    method: "POST", signal: AbortSignal.timeout(60000),
    headers: { "User-Agent": UA, "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} HTTP ${r.status}`);
  const j = await r.json();
  if (!j.d?.success) throw new Error(`${path} was not successful`);
  return j.d.data;
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#0?39;|&#x27;/g, "'").replace(/&amp;/g, "&");
const text = (h) => decode(h.replace(/<[^>]+>/g, " ")).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/[\s​]+/g, " ").trim();

export function parseOccupations(pageHtml) {
  const m = pageHtml.match(/value="(\[\{&quot;occupation&quot;[\s\S]*?\}\])"/);
  if (!m) throw new Error("occupation data not found in page");
  const rows = JSON.parse(decode(m[1]));
  return rows.map((r) => {
    const code = r.anzscocode || "";
    const c22 = (code.match(/ANZSCO 2022[^0-9]*?(\d{6})/) || [])[1];
    const c13 = (code.match(/ANZSCO 2013[^0-9]*?(\d{6})/) || [])[1];
    const visaLines = (r.visas || "").split(";").map((s) => s.trim()).filter(Boolean);
    const o = { n: r.occupation, c: c13 || c22, v: [...new Set(visaLines.map((s) => s.slice(0, 3)))].sort() };
    if (c22 && c22 !== c13) o.c22 = c22;
    if (c13 && c22 && c13 !== c22) o.c13 = c13;
    o.l = (r.list || "").split(";").map((s) => s.trim()).filter(Boolean);
    if (visaLines.some((s) => /^491.*State/i.test(s))) o.s491 = 1;
    const auth = [...(r.assessauth || "").matchAll(/<li><a [^>]*>([^<]+)<\/a>/g)].map((x) => text(x[1]));
    if (auth.length) o.a = auth;
    const cmap = new Map();
    for (const li of (r.visacaveats || "").split("<li>").slice(1)) {
      const vcode = li.slice(0, 3);
      for (const c of li.matchAll(/clickbot-skill-caveat-title'>([\s\S]*?)<\/span>\s*<p>([\s\S]*?)<\/p>/g)) {
        const key = text(c[1]) + ": " + text(c[2]);
        if (!cmap.has(key)) cmap.set(key, new Set());
        cmap.get(key).add(vcode);
      }
    }
    if (cmap.size) o.cv = [...cmap].map(([t, s]) => [[...s].sort().join(","), t]);
    return o;
  });
}

async function getOccupations() {
  const r = await fetch(HA + "/visas/working-in-australia/skill-occupation-list", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(`occupation page HTTP ${r.status}`);
  return parseOccupations(await r.text());
}

async function getFees() {
  const data = await post("/_layouts/15/api/data.aspx/GetPriceList", { onshore: "All", category: "Visa" });
  return data.map((x) => ({
    code: x.visaSubclassCode, name: x.visaSubclassText, stream: x.streamText || "", onshore: x.onShore,
    base: x.basePrice, a18: x.over18Price, u18: x.under18Price, nonInt: x.nonInternetPrice, sub: x.subsequentPrice,
    page: ((x.note || "").match(/<a href='([^']*)' class='open-form-hyperlink'/) || [])[1] || "",
  }));
}

async function getProcessing() {
  const visas = await post("/Visa-subsite/_layouts/15/api/GPT.aspx/GetProcessGuideVisas", {});
  const names = new Map(visas.map((v) => [v.VisaSubclassCode + "|" + v.StreamCode, v.VisaSubclassText.replace(/\s+/g, " ").trim()]));
  const times = await post("/_layouts/15/api/GPT.aspx/GetVisaGlobalProcessingTime",
    { gptRequest: visas.map((v) => ({ VisaSubclassCode: v.VisaSubclassCode, StreamCode: v.StreamCode })) });
  return times.map((t) => ({
    code: t.VisaSubclassCode, stream: t.StreamCode, name: names.get(t.VisaSubclassCode + "|" + t.StreamCode) || "", streamName: t.StreamText || "",
    p25: t.Percent25, p50: t.Percent50, p75: t.Percent75, p90: t.Percent90, updated: t.Updated, endDate: t.EndDate,
  }));
}

async function refresh(file, source, minItems, fetcher) {
  const path = `data/${file}`;
  let old = null;
  try { old = JSON.parse(readFileSync(path, "utf8")); } catch {}
  try {
    const items = await fetcher();
    if (items.length < minItems) throw new Error(`only ${items.length} items (expected at least ${minItems})`);
    if (old && items.length < old.items.length * 0.6) throw new Error(`${items.length} items vs ${old.items.length} before; layout may have changed`);
    if (old && JSON.stringify(old.items) === JSON.stringify(items)) { console.log(`${file}: no changes`); return; }
    mkdirSync("data", { recursive: true });
    writeFileSync(path, JSON.stringify({ source, retrieved: new Date().toISOString().slice(0, 10), items }) + "\n");
    console.log(`${file}: updated (${items.length} items)`);
  } catch (err) {
    console.error(`${file}: ${err.message} - keeping the previous data`);
    process.exitCode = 1; // show the run as failed so a blocked or changed source is noticed
  }
}

if (process.argv[1]?.endsWith("update-visa-data.mjs")) {
  await refresh("occupations.json", HA + "/visas/working-in-australia/skill-occupation-list", 400, getOccupations);
  await refresh("fees.json", HA + "/visas/getting-a-visa/fees-and-charges/current-visa-pricing", 80, getFees);
  await refresh("processing.json", HA + "/visas/getting-a-visa/visa-processing-times/global-visa-processing-times", 40, getProcessing);
}
