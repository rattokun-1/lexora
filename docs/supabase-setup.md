# Supabase / passkey setup

Frontend configuration: `src/cloud-config.js`, public Project URL and publishable key only.
Apply `supabase/migrations/202611020001_user_data.sql` in the project SQL editor (or Supabase migrations). The table has RLS and permits authenticated users to access only their own row. No public directory, ranking, friendship, vocabulary, world or reward-definition tables are used.

Enable Passkeys in Supabase Authentication settings. Configure the RP ID and exact allowed web origins for production; use HTTPS (localhost is suitable for development). SDK: @supabase/supabase-js 2.105.0, experimental.passkey enabled, loaded only when configuration exists.

Account creation and recovery are now implemented with email OTP confirmation followed by passkey registration; normal sign-in uses passkeys. No password authentication. Configure the email templates and SMTP as described in account-onboarding.md.

Existing Firebase cloud records are not automatically migrated or deleted. Local learning saves are preserved. First Supabase login loads an existing personal row, or uploads current local progress when no row exists. A failed read never triggers an overwrite. Auth tokens remain managed by Supabase Auth; UI state, social state, emails and legacy public IDs are excluded from app data uploads.

`user_data.state` is a personal save, not a trusted economy ledger. Coins are non-purchasable local game rewards. Do not introduce purchases or shared competition based on client-provided balances.

Verified locally: `node --test tests/*.test.cjs`. Live authentication/database checks require project configuration and a registered passkey.

Official references:
https://supabase.com/docs/guides/auth/passkeys
https://supabase.com/docs/guides/database/postgres/row-level-security
