import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.js";
import "./styles/tokens.css";
import "./styles/farmer.css";

// No WagmiProvider/RainbowKitProvider here — deliberately. They live only
// inside pages/Admin.tsx, loaded via React.lazy() from App.tsx. This file
// is what the farmer route's whole render tree passes through, so keeping
// it wallet-free here is what makes the wallet-free guarantee structural
// rather than a matter of discipline (D3).
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
