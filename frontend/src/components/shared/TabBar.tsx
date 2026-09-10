import { NavLink, useParams } from "react-router-dom";

/**
 * Bottom navigation across the farmer surface. Deliberately built from
 * NavLink (real routes, real URLs) rather than local tab state — a farmer
 * who bookmarks or shares a page gets the page they were looking at.
 *
 * Wallet-free: every destination here is a farmer route. /admin is
 * reachable from the landing page only, and stays lazy-loaded (D3).
 */

type IconProps = { d: string };

function Icon({ d }: IconProps) {
  return (
    <svg
      className="tabbar__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  protection: "M12 3 19 5.6v5.6c0 4.3-3 7.9-7 9.1-4-1.2-7-4.8-7-9.1V5.6L12 3Z",
  weather: "M7 17.5h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.2A3.6 3.6 0 0 0 7 17.5ZM8.5 20.5l-.6 1.2M12 20.5l-.6 1.2M15.5 20.5l-.6 1.2",
  audit: "M5 3.8h14v16.4H5zM8.4 8.6h7.2M8.4 12h7.2M8.4 15.4h4.4",
  admin: "M5 7h14M5 12h14M5 17h14M9 5.4v3.2M15 10.4v3.2M11 15.4v3.2",
};

export function TabBar() {
  const { id } = useParams<{ id: string }>();
  // Keep the farmer anchored to whichever policy they're viewing; fall
  // back to the demo policy so the tabs are never dead ends from the
  // landing page.
  const policyId = id ?? "1";

  return (
    <nav className="tabbar" aria-label="Sections">
      <NavLink to={`/policy/${policyId}`} end className="tabbar__item">
        <Icon d={ICONS.protection} />
        Protection
      </NavLink>
      <NavLink to={`/policy/${policyId}/weather`} className="tabbar__item">
        <Icon d={ICONS.weather} />
        Weather
      </NavLink>
      <NavLink to={`/policy/${policyId}/audit`} className="tabbar__item">
        <Icon d={ICONS.audit} />
        Audit
      </NavLink>
      <NavLink to="/admin" className="tabbar__item">
        <Icon d={ICONS.admin} />
        Admin
      </NavLink>
    </nav>
  );
}
