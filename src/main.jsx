import React from "react";
import { createRoot } from "react-dom/client";
import "jaml-ui/fonts.css";
import "jaml-ui/jimbo.css";
import "./global.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
