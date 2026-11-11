import { Router } from "express";
import { db } from "./db.js";
import { newId } from "./auth.js";

export const domainHunter = Router();
db.exec(`
CREATE TABLE IF NOT EXISTS domain_candidates (
 id TEXT PRIMARY KEY, domain TEXT NOT NULL UNIQUE COLLATE NOCASE,
 score INTEGER NOT NULL, tier TEXT NOT NULL, analysis_json TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'watchlist',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS domain_candidates_score_idx ON domain_candidates(score DESC);
`);

const now = () => new Date().toISOString();
function normalizeDomain(input) {
 const domain = String(input || "").trim().toLowerCase().replace(/^https?:\\/\\//, "").replace(/\\/$/, "");
 if (domain.length > 253 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(domain)) return null;
 return domain;
}
function assess(domain, rdap, dns) {
 const labels = domain.split(".");
 const name = labels.slice(0, -1).join(".");
 const tld = labels.at(-1);
 const words = name.split(/[-0-9]+/).filter(Boolean);
 const vowelRatio = (name.match(/[aeiou]/g) || []).length / Math.max(1, name.length);
 const pronounceable = words.length === 1 && name.length >= 4 && name.length <= 10 && vowelRatio >= .2 && vowelRatio <= .65;
 const short = name.length <= 6;
 const clean = /^[a-z]+$/.test(name);
 const commercial = /(ai|pay|cloud|data|health|bio|fin|tech|labs|shop|bank|robot|agent|secure|energy)/i.test(name);
 const penalties = [];
 let score = 25;
 if (tld === "com") score += 25; else { score += 5; penalties.push("ليس امتداد .com"); }
 if (short) score += 15;
 if (clean) score += 10; else { score -= 12; penalties.push("يحتوي أرقاماً أو شرطات"); }
 if (pronounceable) score += 12; else { score -= 4; penalties.push("سهولة النطق تحتاج مراجعة"); }
 if (commercial) score += 8;
 if (dns?.available === true) score += 5;
 if (rdap?.registered === true) { score -= 35; penalties.push("النطاق مسجل حالياً وفق RDAP"); }
 if (rdap?.registered === false) score += 3;
 score = Math.max(0, Math.min(100, score));
 const tier = score >= 95 ? "استثنائي محتمل" : score >= 85 ? "كنز محتمل" : score >= 75 ? "قوي" : score >= 60 ? "جيد" : "ضعيف";
 return { domain, score, tier, factors: { tld, length: name.length, short, clean, pronounceable, commercial, rdapRegistered: rdap?.registered ?? null, dnsAvailable: dns?.available ?? null }, penalties, caveats: ["هذا تقييم فرز أولي وليس تقديراً لسعر البيع.", "لم يتم التحقق من العلامات التجارية أو المبيعات المقارنة تلقائياً.", "حالة RDAP وDNS ليست ضماناً لإمكانية التسجيل؛ تحقق لدى مسجل معتمد."], checkedAt: now() };
}
async function inspect(domain) {
 const [rdapResult, dnsResult] = await Promise.allSettled([
  fetch("https://rdap.org/domain/" + encodeURIComponent(domain), { headers: { accept: "application/rdap+json" }, signal: AbortSignal.timeout(7000) }),
  fetch("https://dns.google/resolve?name=" + encodeURIComponent(domain) + "&type=A", { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(7000) })
 ]);
 let rdap = { registered: null, registrar: null, statuses: [], events: [] };
 if (rdapResult.status === "fulfilled") {
  const response = rdapResult.value;
  if (response.status === 404) rdap.registered = false;
  else if (response.ok) {
   const data = await response.json(); rdap.registered = true;
   rdap.statuses = Array.isArray(data.status) ? data.status : [];
   rdap.events = Array.isArray(data.events) ? data.events.map(e => ({ action: e.eventAction, date: e.eventDate })) : [];
   rdap.registrar = data.entities?.find(e => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find(x => x[0] === "fn")?.[3] || null;
  }
 }
 let dns = { available: null, answers: 0 };
 if (dnsResult.status === "fulfilled" && dnsResult.value.ok) {
  const data = await dnsResult.value.json(); dns.answers = data.Answer?.length || 0;
  if (dns.answers > 0) dns.available = false;
  else if (data.Status === 3) dns.available = true;
 }
 return { rdap, dns };
}
domainHunter.post("/analyze", async (req, res) => {
 const domain = normalizeDomain(req.body?.domain);
 if (!domain) return res.status(400).json({ error: "أدخل نطاقاً صحيحاً مثل example.com." });
 try {
  const evidence = await inspect(domain);
  res.json({ analysis: assess(domain, evidence.rdap, evidence.dns), rdap: evidence.rdap, dns: evidence.dns });
 } catch { res.status(502).json({ error: "تعذر الوصول إلى مصادر RDAP/DNS الآن. حاول لاحقاً." }); }
});
domainHunter.get("/candidates", (req, res) => {
 const rows = db.prepare("SELECT * FROM domain_candidates ORDER BY score DESC, updated_at DESC LIMIT 200").all();
 res.json({ candidates: rows.map(r => ({ id:r.id, domain:r.domain, score:r.score, tier:r.tier, notes:r.notes, status:r.status, analysis:JSON.parse(r.analysis_json), updatedAt:r.updated_at })) });
});
domainHunter.post("/candidates", (req, res) => {
 const a = req.body?.analysis;
 const domain = normalizeDomain(a?.domain);
 const score = Number(a?.score);
 if (!domain || !Number.isInteger(score) || score < 0 || score > 100) return res.status(400).json({ error: "نتيجة التحليل غير صالحة." });
 const stamp = now(), id = newId(), tier = String(a.tier || "غير مصنف").slice(0, 40);
 try {
  db.prepare("INSERT INTO domain_candidates(id,domain,score,tier,analysis_json,notes,status,created_at,updated_at) VALUES(?,?,?,?,?,?, 'watchlist',?,?)")
   .run(id, domain, score, tier, JSON.stringify(a), String(req.body?.notes || "").slice(0,1000), stamp, stamp);
  res.status(201).json({ ok:true, id });
 } catch { res.status(409).json({ error: "هذا النطاق موجود بالفعل في قائمة الصيد." }); }
});
domainHunter.delete("/candidates/:id", (req, res) => {
 const result = db.prepare("DELETE FROM domain_candidates WHERE id=?").run(req.params.id);
 if (!result.changes) return res.status(404).json({ error: "النطاق غير موجود." });
 res.status(204).end();
});
