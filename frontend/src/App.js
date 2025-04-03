import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UploadVideo from "./components/UploadVideo";
import AnnotationTool from "./components/AnnotationTool";
import TrainModel from "./components/TrainModel";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <h1>YOLOv8 Custom Training</h1>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<UploadVideo />} />
            <Route path="/annotation" element={<AnnotationTool />} />
            <Route path="/train" element={<TrainModel />} />
          </Routes>
        </main>
        <footer className="footer">
          <p>© 2024 YOLOv8 Custom Training. All rights reserved.</p>
        </footer>
        <ToastContainer />
      </div>
    </Router>
  );
}

export default App;