import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SpotifyApp from "./SpotifyApp";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SpotifyApp />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
