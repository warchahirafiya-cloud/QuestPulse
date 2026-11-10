-- Align the API database with the active registry safety hold.
-- Preserve every placeholder row; this migration changes status metadata only.
UPDATE opportunities
SET
  status = 'paused',
  payload = json_set(
    payload,
    '$.status', 'paused',
    '$.availability', 'paused',
    '$.officialUrl', NULL,
    '$.notes', 'TEMPORARILY PAUSED — placeholder category only. Neutral educational information only pending qualified written legal review. No participation links, referral links, bot invitations, deposits, activation fees, claim instructions, or payment promises.',
    '$.riskNotes', 'Legal and operational review pending. No assessment of legality, safety, availability, or payout is implied.',
    '$.statusHistory', json_array(
      json_object(
        'status', 'paused',
        'date', date('now'),
        'reason', 'Temporary precautionary hold pending qualified written legal review.'
      )
    )
  ),
  updated_at = datetime('now')
WHERE id IN (
  'airdrop-campaigns',
  'telegram-bots',
  'daily-click',
  'task-rewards',
  'referral-programs'
);
