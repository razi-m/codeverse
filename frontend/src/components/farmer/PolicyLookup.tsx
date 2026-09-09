import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../shared/Button.js";

/** Landing-page policy ID input, numeric keypad on mobile (Design.md § Mobile Experience). */
export function PolicyLookup() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = value.trim();
    if (id) navigate(`/policy/${id}`);
  }

  return (
    <form className="policy-lookup" onSubmit={handleSubmit}>
      <label htmlFor="policy-id" style={{ display: "none" }}>
        Policy ID
      </label>
      <input
        id="policy-id"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="Enter your policy ID"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button type="submit" variant="primary">
        Look up
      </Button>
    </form>
  );
}
