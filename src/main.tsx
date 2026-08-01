import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";
import { installGlobalFrontendErrorHandlers } from "@/observability/frontend-error-reporting";

installGlobalFrontendErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
