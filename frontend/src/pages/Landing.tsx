import { Link } from "react-router-dom";
import { PolicyLookup } from "../components/farmer/PolicyLookup.js";
import { Card } from "../components/shared/Card.js";

export default function Landing() {
  return (
    <div className="farmer-page">
      <h1>KisanShield</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--sp-6)" }}>
        Crop insurance that pays automatically when the weather triggers it — no paperwork, no
        wallet, no waiting for approval.
      </p>

      <Card>
        <h2 style={{ fontSize: "var(--fs-h2)", marginTop: 0 }}>Check your policy</h2>
        <PolicyLookup />
      </Card>

      <p style={{ marginTop: "var(--sp-6)", fontSize: "var(--fs-small)" }}>
        <Link to="/admin">Insurer sign-in</Link>
      </p>
    </div>
  );
}
