import { Button } from "../shared/Button.js";

/** Non-technical error with retry (Design.md § Component Inventory, § Interaction Guidelines). */
export function FarmerErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <div className="error-state__mark" aria-hidden="true">
        ⌗
      </div>
      <p className="error-state__text">{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
