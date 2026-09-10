import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  fetchPolicy,
  fetchWeather,
  type Policy,
  type WeatherReadout,
  type LanguageCode,
} from "../lib/api.js";
import { Masthead, RegistryStrip } from "../components/shared/Masthead.js";
import { LanguageSwitcher } from "../components/farmer/LanguageSwitcher.js";
import { FarmerErrorState } from "../components/farmer/FarmerErrorState.js";
import { PolicySkeleton } from "./PolicySkeleton.js";

/**
 * The observation record — daily rainfall for the policy's own
 * coordinates, read live from Open-Meteo via the backend's read-only
 * /api/weather endpoint (P9). Nothing here writes to the chain, and no
 * wallet is involved: this is the farmer's view of the raw weather behind
 * the decision on the Protection tab.
 */
export default function WeatherView() {
  const { id } = useParams<{ id: string }>();
  const policyId = Number(id);

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [wx, setWx] = useState<WeatherReadout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>("en");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchPolicy(policyId);
      setPolicy(p);
      if (!p.coordinates) {
        setError("We don't have mapped coordinates for this area yet, so daily rainfall can't be shown.");
        return;
      }
      const w = await fetchWeather(p.coordinates.latitude, p.coordinates.longitude, 14);
      setWx(w);
    } catch (err) {
      if (err instanceof TypeError) {
        setError("We couldn't reach KisanShield right now. Please check your connection and try again.");
      } else if (err instanceof Error && err.message === "Policy not found") {
        setError("We couldn't find a policy with that number.");
      } else {
        setError("The weather service didn't respond. Please try again in a moment.");
      }
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    if (!Number.isInteger(policyId) || policyId < 1) {
      setError("That doesn't look like a valid policy number.");
      setLoading(false);
      return;
    }
    load();
  }, [policyId, load]);

  if (loading) return <PolicySkeleton />;

  const header = (
    <>
      <Masthead actions={<LanguageSwitcher value={language} onChange={setLanguage} />} />
      <RegistryStrip
        index="Observation Record // 14-Day Window"
        id={policy ? `ID: KS-IND-${String(policy.id).padStart(6, "0")}` : "—"}
      />
    </>
  );

  if (error || !wx || !policy) {
    return (
      <div className="farmer-page">
        {header}
        <FarmerErrorState message={error ?? "Unable to load the weather record."} onRetry={load} />
      </div>
    );
  }

  const peak = Math.max(...wx.daily.map((d) => d.precipitationMm ?? 0), 1);
  const breached = wx.cumulativeMm < policy.thresholdValue;

  return (
    <div className="farmer-page">
      {header}

      <div className="stagger">
        <section className="hero" style={{ ["--i" as string]: 0, paddingBottom: "var(--sp-6)" }}>
          <p className="hero__eyebrow">{wx.source}</p>
          <h1 className="hero__title" style={{ fontSize: "var(--fs-h1)", maxWidth: "24ch" }}>
            Rainfall measured over your field
          </h1>
          <p className="hero__lede" style={{ fontSize: "var(--fs-small)" }}>
            {wx.latitude.toFixed(4)}° N, {wx.longitude.toFixed(4)}° E · {policy.regionDisplayName}
          </p>
        </section>

        <div className="card card--ticked" style={{ ["--i" as string]: 1 }}>
          <div className="readout">
            <div className={breached ? "readout--breach" : undefined}>
              <span className="readout__label">Cumulative rain</span>
              <span className="readout__value">
                {wx.cumulativeMm.toFixed(1)}
                <span className="readout__unit">mm</span>
              </span>
              <span className="readout__note">
                {wx.daysWithData} of {wx.daysRequested} days recorded
              </span>
            </div>
            <div>
              <span className="readout__label">Payout trigger</span>
              <span className="readout__value">
                &lt; {policy.thresholdValue}
                <span className="readout__unit">mm</span>
              </span>
              <span className="readout__note">
                {breached ? "Below threshold" : "Above threshold"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ ["--i" as string]: 2 }}>
          <div className="section-head">
            <span className="section-head__text">Daily record</span>
            <span className="section-head__rule" />
          </div>

          <div className="card">
            <ul className="wx-list">
              {wx.daily.map((day, i) => {
                const mm = day.precipitationMm;
                const pct = mm === null ? 0 : Math.max(2, (mm / peak) * 100);
                return (
                  <li className="wx-row" key={day.date}>
                    <span className="wx-row__date">
                      {new Date(day.date + "T00:00:00Z").toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                    <span className="wx-row__track">
                      <span
                        className={`wx-row__bar${mm !== null && mm < 1 ? " wx-row__bar--dry" : ""}`}
                        style={{ width: `${pct}%`, ["--i" as string]: i }}
                      />
                    </span>
                    <span className="wx-row__val">{mm === null ? "—" : `${mm.toFixed(1)}`}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mono-label" style={{ marginTop: "var(--sp-3)" }}>
            Fetched {new Date(wx.fetchedAt).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </div>
  );
}
