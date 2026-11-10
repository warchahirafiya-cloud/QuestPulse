CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified', 'under_review', 'paused', 'paused', 'expired')),
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_opportunities_type_status
  ON opportunities(type, status);

-- Seed only the five existing educational category placeholders.
-- These records are deliberately unverified and contain no participation links.
INSERT OR IGNORE INTO opportunities (id, type, status, payload) VALUES
('airdrop-campaigns', 'airdrop', 'paused', '{"id":"airdrop-campaigns","type":"airdrop","status":"unverified","availability":"unknown","officialUrl":null,"reviewedAt":null,"verificationSources":[],"paymentEvidence":[],"riskLevel":"unrated","notes":"TEMPORARILY PAUSED — placeholder category only. Neutral educational information only pending qualified written legal review.","withdrawalTerms":null,"resetInterval":null,"paymentEvidenceSummary":null,"riskNotes":null,"statusHistory":[]}'),
('telegram-bots', 'telegram', 'paused', '{"id":"telegram-bots","type":"telegram","status":"unverified","availability":"unknown","officialUrl":null,"reviewedAt":null,"verificationSources":[],"paymentEvidence":[],"riskLevel":"unrated","notes":"TEMPORARILY PAUSED — placeholder category only. No bot invitation or payment claim is published.","withdrawalTerms":null,"resetInterval":null,"paymentEvidenceSummary":null,"riskNotes":null,"statusHistory":[]}'),
('daily-click', 'clicktime', 'paused', '{"id":"daily-click","type":"clicktime","status":"unverified","availability":"unknown","officialUrl":null,"reviewedAt":null,"verificationSources":[],"paymentEvidence":[],"riskLevel":"unrated","notes":"TEMPORARILY PAUSED — placeholder category only. No mining or reward activity is represented as active.","withdrawalTerms":null,"resetInterval":null,"paymentEvidenceSummary":null,"riskNotes":null,"statusHistory":[]}'),
('task-rewards', 'tasks', 'paused', '{"id":"task-rewards","type":"tasks","status":"unverified","availability":"unknown","officialUrl":null,"reviewedAt":null,"verificationSources":[],"paymentEvidence":[],"riskLevel":"unrated","notes":"TEMPORARILY PAUSED — placeholder category only. Payment and withdrawal conditions are unknown.","withdrawalTerms":null,"resetInterval":null,"paymentEvidenceSummary":null,"riskNotes":null,"statusHistory":[]}'),
('referral-programs', 'referral', 'paused', '{"id":"referral-programs","type":"referral","status":"unverified","availability":"unknown","officialUrl":null,"reviewedAt":null,"verificationSources":[],"paymentEvidence":[],"riskLevel":"unrated","notes":"TEMPORARILY PAUSED — placeholder category only. No referral link or promotion is published.","withdrawalTerms":null,"resetInterval":null,"paymentEvidenceSummary":null,"riskNotes":null,"statusHistory":[]}');
