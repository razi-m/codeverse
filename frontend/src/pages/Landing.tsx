import { Link } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Masthead, RegistryStrip } from "../components/shared/Masthead.js";
import { HowThisWorks } from "../components/farmer/HowThisWorks.js";

/**
 * The entry document. A farmer arrives here with a policy number on a
 * paper slip and nothing else — no wallet, no account, no app install.
 * The single job of this page is to get that number into the lookup.
 */
export default function Landing() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = value.trim();
    if (id) navigate(`/policy/${id}`);
  }

  return (
    <div className="farmer-page">
      <Masthead />
      <RegistryStrip index="Cadastral Index // 2026.S2-Kharif" id="Public Register" />

      <div className="stagger">
        <section className="hero" style={{ ["--i" as string]: 0 }}>
          <p className="hero__eyebrow">Sovereign Parametric Underwriting</p>
          <h1 className="hero__title">
            Insurance that responds when the <em>weather</em> does.
          </h1>
          <p className="hero__lede">
            Weather-triggered crop protection for Indian smallholders. No paperwork, no wallets,
            no waiting for an assessor to visit your field.
          </p>
        </section>

        <div style={{ ["--i" as string]: 1 }}>
          {!open ? (
            <button type="button" className="cta-bar" onClick={() => setOpen(true)}>
              <span>Check my policy</span>
              <span className="cta-bar__arrow" aria-hidden="true">
                →
              </span>
            </button>
          ) : (
            <div className="card card--ticked">
              <h2 className="card__title">Enter your policy number</h2>
              <form className="policy-lookup" onSubmit={handleSubmit}>
                <label htmlFor="policy-id" className="mono-label" style={{ display: "none" }}>
                  Policy number
                </label>
                <input
                  id="policy-id"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 1"
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <button type="submit" className="button button--primary">
                  Look up
                </button>
              </form>
              <p
                className="mono-label"
                style={{ marginTop: "var(--sp-4)", marginBottom: 0, letterSpacing: "0.1em" }}
              >
                Printed on the slip issued when your cover began
              </p>
            </div>
          )}
        </div>

        <div style={{ ["--i" as string]: 2 }}>
          <div className="section-head">
            <span className="section-head__text">How it works</span>
            <span className="section-head__rule" />
          </div>
          <HowThisWorks />
        </div>

        <p
          style={{
            ["--i" as string]: 3,
            marginTop: "var(--sp-12)",
            paddingTop: "var(--sp-4)",
            borderTop: "1px solid var(--border)",
          }}
          className="mono-label"
        >
          <Link to="/admin">Insurer console →</Link>
        </p>
      </div>
    </div>
  );
}
