import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * The document header. A cadastral survey sheet's masthead: the issuing
 * body, a registry mark, and whatever instrument (language switcher, etc.)
 * belongs at the top-right.
 */
export function Masthead({ actions }: { actions?: ReactNode }) {
  return (
    <header className="masthead">
      <Link to="/" className="masthead__brand" aria-label="KisanShield, home">
        <svg
          className="masthead__mark"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          {/* Shield over a ploughed field — the mark */}
          <path
            d="M12 2.2 20.2 5v6.4c0 5-3.5 9.2-8.2 10.6C7.3 20.6 3.8 16.4 3.8 11.4V5L12 2.2Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M7.4 12.4h9.2M8.4 15.2h7.2M6.9 9.6h10.2"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
        <span>
          <span className="masthead__name">KisanShield</span>
          <span className="masthead__sub">Sovereign Underwriting</span>
        </span>
      </Link>
      {actions}
    </header>
  );
}

/**
 * The band under the masthead carrying registry metadata — season index
 * on the left, document ID on the right. Pure document furniture: it
 * makes the page read as an official record rather than a web app.
 */
export function RegistryStrip({ index, id }: { index: string; id: string }) {
  return (
    <div className="registry-strip">
      <span className="registry-strip__left">
        <span className="registry-strip__dot" aria-hidden="true" />
        <span className="registry-strip__id">{index}</span>
      </span>
      <span className="registry-strip__id">{id}</span>
    </div>
  );
}
