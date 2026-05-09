import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { TRPCProvider } from "./providers/trpc";
import { LangProvider } from "./hooks/useLang";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <LangProvider>
          <App />
        </LangProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>
);
