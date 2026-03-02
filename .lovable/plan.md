
Goal: fix the onboarding failure where selecting “Shop Owner” or “Normal User” and pressing Continue shows “Not authenticated”.

What I found
- Session replay shows: user reaches onboarding, clicks Continue, gets “Not authenticated”.
- Network/auth logs show repeated `GET /auth/v1/user -> 403 user_not_found` for JWT `sub = b960...`.
- That user ID was deleted, but the browser still has an old local session token.
- In code, `App.tsx` trusts `getSession()` (local token), while `Onboarding.tsx` uses `getUser()` (server validation). This mismatch causes onboarding to render even when the server says auth is invalid.

Implementation plan
1. Harden auth bootstrap in `src/App.tsx`
- Add a single `syncAuthState` function used by both:
  - initial load
  - `onAuthStateChange`
- Flow:
  - read session
  - if no session: set unauthenticated
  - if session exists: validate with `supabase.auth.getUser()`
  - if invalid (`!user` or auth error): clear local auth (`signOut` local scope), set session/role to null
  - only then run `checkRole(user.id)`

2. Make onboarding resilient in `src/pages/Onboarding.tsx`
- In `handleContinue`, if `getUser()` fails:
  - clear broken local session
  - show friendly message (“Session expired, please sign in again”)
  - redirect to `/login` instead of staying stuck on onboarding.

3. Add defensive role-check error handling in `src/App.tsx`
- Update `checkRole` to handle query auth errors explicitly.
- If role query fails due auth invalidity, reset to unauthenticated state instead of silently proceeding.

4. Keep existing role model/security intact
- No role storage changes (still using `user_roles` table only).
- No RLS/schema changes needed for this bug.

Validation plan
- Case A: Fresh Google login (new user) → onboarding appears → pick role → Continue → lands on dashboard.
- Case B: Stale/deleted token in browser → app should auto-recover to login (no onboarding “Not authenticated” dead-end).
- Case C: Viewer user → dashboard/shops visible, devices hidden + route blocked.
- Case D: Shop owner user → dashboard/shops/devices access works.

Technical details
- Root issue is client-side session trust mismatch:
```text
Current:
getSession() says "logged in" (local token)
getUser() says "not authenticated" (server rejects token)

Fix:
Always validate local session with getUser() before treating user as authenticated.
If invalid -> clear local session + force login.
```
- Files to update:
  - `src/App.tsx`
  - `src/pages/Onboarding.tsx`
