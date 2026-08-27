import { setupIonicReact } from "@ionic/react";
import { createRoot } from "react-dom/client";
import { MobileApp } from "./MobileApp";
import "@ionic/react/css/core.css";
import "./mobile.css";

setupIonicReact({ mode: "md" });

const root = document.getElementById("root");
if (!root) throw new Error("Missing CodeLogicX mobile application root.");

createRoot(root).render(<MobileApp />);
