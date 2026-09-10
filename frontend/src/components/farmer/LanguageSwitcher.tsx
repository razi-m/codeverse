import type { LanguageCode } from "../../lib/api.js";

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
];

/**
 * P9: switches which language the ledger is fetched and rendered in.
 * Native-script labels (not "Hindi"/"Marathi" in English) so a farmer who
 * can't read English can still recognise their own language by sight.
 */
export function LanguageSwitcher({
  value,
  onChange,
}: {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
}) {
  return (
    <div className="language-switcher" role="group" aria-label="Choose language">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={`button language-switcher__option${value === code ? " button--primary" : ""}`}
          aria-pressed={value === code}
          onClick={() => onChange(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
