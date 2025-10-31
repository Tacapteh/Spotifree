import React from "react";
import ReactDOM from "react-dom/client";
// import "./index.css";
// import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <div style={{padding: '20px', backgroundColor: 'red', color: 'white'}}>
      <h1>MINIMAL TEST</h1>
      <p>React is working without CSS imports</p>
    </div>
  </React.StrictMode>,
);
