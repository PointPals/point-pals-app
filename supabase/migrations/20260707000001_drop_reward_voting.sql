-- Rewards are parent-set now (Section A of the rewards overhaul): kids don't
-- have logins, so the propose-and-vote mechanic was removed from the app. Drop
-- the backing tables — reward_history (kept) is the only reward record.
drop table if exists public.reward_votes;
drop table if exists public.reward_proposals;
