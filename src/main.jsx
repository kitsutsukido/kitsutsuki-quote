import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { VendorsProvider } from "./lib/vendors.jsx";
import { DataGate } from "./components/DataGate.jsx";
import { AuthGate } from "./components/AuthGate.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <VendorsProvider>
        <DataGate>{(boot) => <App boot={boot} />}</DataGate>
      </VendorsProvider>
    </AuthGate>
  </React.StrictMode>
);
