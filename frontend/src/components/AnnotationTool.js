import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import "./AnnotationTool.css"; // Import CSS file

function AnnotationTool() {
  const location = useLocation();
  const { selectedFrames } = location.state || { selectedFrames: [] };
  const [currentFrame, setCurrentFrame] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentBox, setCurrentBox] = useState(null);
  const [classNames, setClassNames] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const imageRef = useRef(null);
  const dropdownRef = useRef(null); // Reference for dropdown

  useEffect(() => {
    if (selectedFrames.length > 0) {
      setCurrentFrame(selectedFrames[0]);
    };
  }, [selectedFrames]);

  useEffect(() => {
    if (currentFrame) {
      const savedAnnotations = localStorage.getItem(`annotations-${currentFrame}`);
      setAnnotations(savedAnnotations ? JSON.parse(savedAnnotations) : []);
    }
  }, [currentFrame]);

  const handleMouseDown = (e) => {
    if (dropdownRef.current && dropdownRef.current.contains(e.target)) {
      return; // If the dropdown was clicked, do not start drawing
    }
    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartX(x);
    setStartY(y);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCurrentBox({
      x: Math.min(x, startX),
      y: Math.min(y, startY),
      width: Math.abs(x - startX),
      height: Math.abs(y - startY),
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox) {
      const newAnnotation = { ...currentBox, class: "" };
      const updatedAnnotations = [...annotations, newAnnotation];
      setAnnotations(updatedAnnotations);
      localStorage.setItem(`annotations-${currentFrame}`, JSON.stringify(updatedAnnotations));
    }
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const handleClassChange = (index, newClass) => {
    const updatedAnnotations = annotations.map((ann, i) =>
      i === index ? { ...ann, class: newClass } : ann
    );
    setAnnotations(updatedAnnotations);
    localStorage.setItem(`annotations-${currentFrame}`, JSON.stringify(updatedAnnotations));
  };

  const removeAnnotation = (index) => {
    const updatedAnnotations = annotations.filter((_, i) => i !== index);
    setAnnotations(updatedAnnotations);
    localStorage.setItem(`annotations-${currentFrame}`, JSON.stringify(updatedAnnotations));
  };

  const saveAnnotations = async () => {
    try {
      await axios.post("http://localhost:5000/annotations", {
        frame: currentFrame,
        annotations,
      });
      toast.success("Annotations saved!");
    } catch (error) {
      toast.error("Error saving annotations.");
    }
  };

  const handleClassNamesChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleClassNamesBlur = () => {
    if (!inputValue.trim()) return;
  
    const classNamesArray = inputValue.split(",").map(name => name.trim());
    const updatedClassNames = [...new Set([...classNames, ...classNamesArray])]; // Remove duplicates
    setClassNames(updatedClassNames);
    localStorage.setItem("classNames", JSON.stringify(updatedClassNames)); // Save to localStorage
    // Don't clear inputValue so it remains in the input field
  };
  
  

  const handleFrameChange = (e) => {
    setCurrentFrame(e.target.value);
    setAnnotations([]);
  };

  const handleTrainModel = () => {
    if (annotations.length === 0) {
      toast.error("No annotations to train the model.");
      return;
    }
    localStorage.setItem("annotations", JSON.stringify(annotations));
    window.location.href = "/train";
  }

  return (
    <div className="annotation-tool">
      <h2>Annotation Tool</h2>
      <div className="class-names-input">
        <label>Enter Class Names (comma separated): </label>
        <input 
          type="text" 
          value={inputValue}
          onChange={handleClassNamesChange} 
          onBlur={handleClassNamesBlur} 
          placeholder="e.g. Car, Person, Tree" 
        />
      </div>
      {selectedFrames.length > 0 ? (
        <div className="annotation-interface">
          <div className="frame-selector">
            <label>Select Frame: </label>
            <select value={currentFrame} onChange={handleFrameChange}>
              {selectedFrames.map((frame, index) => (
                <option key={index} value={frame}>
                  Frame {index + 1}
                </option>
              ))}
            </select>
          </div>
          <div
            className="frame-container"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            ref={imageRef}
          >
            <img
              src={`http://localhost:5000/frames/${currentFrame}`}
              alt="Frame"
              onDragStart={(e) => e.preventDefault()} // Prevent image drag
            />
            {annotations.map((ann, index) => (
              <div 
                key={index} 
                className="annotation-box" 
                style={{
                  left: ann.x,
                  top: ann.y,
                  width: ann.width,
                  height: ann.height,
                }}
              >
                <select 
                  value={ann.class} 
                  onChange={(e) => handleClassChange(index, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()} // Prevents parent div from catching the event
                  ref={dropdownRef}
                >
                  <option value="">Select a class</option>
                  {classNames.map((className, i) => (
                    <option key={i} value={className}>{className}</option>
                  ))}
                </select>
                <button onClick={(e) => { e.stopPropagation(); removeAnnotation(index); }}>
                  Remove
                </button>
              </div>
            ))}
            {isDrawing && currentBox && (
              <div className="annotation-box drawing" style={{
                left: currentBox.x,
                top: currentBox.y,
                width: currentBox.width,
                height: currentBox.height,
              }} />
            )}
          </div>
          <div className="button-container">
            <button className="save-annotation-button" onClick={saveAnnotations}>Save Annotation</button>
            <button className="train-model-button" onClick={handleTrainModel}>Train Model</button>
          </div>
        </div>
      ) : (
        <p>No frames selected for annotation.</p>
      )}
    </div>
  );
}

export default AnnotationTool;
