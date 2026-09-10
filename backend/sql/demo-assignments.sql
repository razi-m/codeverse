-- Manual, two-step demo seed — NOT auto-applied, NOT run by any script.
-- Run this by hand before demoing the auth flow against policy 1.
--
-- Why two steps: a farmers row can't be referenced by auth_user_id until
-- a real Supabase Auth phone-OTP login has actually happened once — there
-- is no way to fabricate that server-side without a real SMS round trip.

-- Step 1: point the seeded demo farmer at the phone number you will
-- actually log in with during the demo. Run this FIRST, before logging in.
update farmers
set phone = '6005529862' -- replace with the real demo number, 10 digits, no country code
where wallet_address ilike '0x90F79bf6EB2c4f870365E785982E1f101E93b906';

-- Step 2: log in once via the running frontend's /login with that same
-- number. Supabase Auth creates the auth.users row, and POST
-- /api/auth/link-farmer (called automatically after OTP verification)
-- finds the farmers row above by phone and sets its auth_user_id.
--
-- THEN, after that login has completed, run:
insert into policy_assignments (policy_id, farmer_id, assigned_by)
select 1, id, 'manual-demo-seed'
from farmers
where phone = '6005529862'
on conflict (policy_id, farmer_id) do nothing;

-- Step 3 (admin/insurer demo login): grant one test user the insurer
-- role, so /admin's Supabase-session gate has someone to let through.
-- Replace the auth_user_id below with the real one from auth.users
-- (Supabase dashboard -> Authentication -> Users) after that person logs
-- in once via the insurer login form.
-- insert into app_users (auth_user_id, role)
-- values ('REPLACE-WITH-REAL-AUTH-USER-UUID', 'insurer')
-- on conflict (auth_user_id) do update set role = excluded.role;
