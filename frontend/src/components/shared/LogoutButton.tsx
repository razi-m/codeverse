import { useAuth } from "../../lib/AuthContext.js";

/**
 * Signs the current Supabase session out. Placed wherever a session is
 * active (farmer Masthead actions, insurer console) so switching to a
 * different demo phone number doesn't require clearing browser storage
 * by hand — supabase.auth.signOut() already exists in AuthContext, this
 * is just the missing UI to trigger it.
 */
export function LogoutButton() {
  const { session, logout } = useAuth();
  if (!session) return null;

  return (
    <button type="button" className="button" onClick={() => logout()}>
      Log out
    </button>
  );
}
