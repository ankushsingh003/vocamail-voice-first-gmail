/**
 * frontend/src/main.jsx — React Application Entry Point
 * ======================================================
 * Think of this file like the ignition key of our React frontend.
 * It grabs the `<div id="root">` element inside `index.html` and
 * boots up our React component tree with React 18's `createRoot`.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
