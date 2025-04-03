import React, { useState, useEffect } from "react";
import axios from "axios";
import "./TrainModel.css"; // Import the CSS file for styling

function TrainModel({ videoId }) {
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [epochs, setEpochs] = useState(10);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Retrieve class names from localStorage
    const savedClasses = JSON.parse(localStorage.getItem("classNames")) || [];
    setClasses(savedClasses);
    setSelectedClasses(savedClasses); // Initially select all classes
  }, []);

  const handleClassChange = (className) => {
    setSelectedClasses((prevSelected) =>
      prevSelected.includes(className)
        ? prevSelected.filter((c) => c !== className)
        : [...prevSelected, className]
    );
  };

  const handleSelectAll = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([]); // Deselect all if all are selected
    } else {
      setSelectedClasses(classes); // Select all
    }
  };

  const handleTrain = async () => {
    if (selectedClasses.length === 0) {
      setMessage("Please select at least one class to detect.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/train", {
        classes: selectedClasses,
        epochs: epochs,
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage("Error starting training.");
    }
  };

  return (
    <div>
      <h2>Train Model</h2>
      <div>
        <label>Classes: </label>
        <div>
          <input
            type="checkbox"
            checked={selectedClasses.length === classes.length}
            onChange={handleSelectAll}
          />
          <label>Select All</label>
        </div>
        <div className="class-grid">
          {classes.map((className, index) => (
            <div key={index} className="class-item">
              <input
                type="checkbox"
                checked={selectedClasses.includes(className)}
                onChange={() => handleClassChange(className)}
              />
              <label>{className}</label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <label>Epochs: </label>
        <input
          type="number"
          value={epochs}
          onChange={(e) => setEpochs(e.target.value)}
        />
      </div>
      <button onClick={handleTrain}>Start Training</button>
      {message && <p>{message}</p>}
    </div>
  );
}

export default TrainModel;
