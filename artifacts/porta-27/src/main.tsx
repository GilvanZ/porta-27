import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap";
document.head.appendChild(fontLink);

document.title = "Porta 27";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
