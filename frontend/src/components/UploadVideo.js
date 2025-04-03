import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";

const socket = io("http://localhost:5000");

function UploadVideo({ onUpload = () => {}, onAnnotate = () => {} }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [frames, setFrames] = useState([]);
  const [selectedFrames, setSelectedFrames] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("frame_progress", (data) => {
      setUploadProgress(data.progress);
    });

    socket.on("frames_extracted", (data) => {
      setFrames(data.frames);
    });

    socket.on("frame_extraction_error", (data) => {
      toast.error(`Frame extraction error: ${data.error}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      await uploadFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      await uploadFile(droppedFile);
    }
  };

  const uploadFile = async (file) => {
    console.log("Uploading file...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Upload successful:", response.data);
      toast.success("Frames Extracted successfully!");

      if (typeof onUpload === "function") {
        onUpload(response.data.video_path);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading file.");
    }
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current.click();
  };

  const handleFrameSelect = (frame) => {
    setSelectedFrames((prevSelectedFrames) =>
      prevSelectedFrames.includes(frame)
        ? prevSelectedFrames.filter((f) => f !== frame)
        : [...prevSelectedFrames, frame]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedFrames([]);
    } else {
      setSelectedFrames(frames);
    }
    setSelectAll(!selectAll);
  };

  const handleAnnotate = () => {
    if (typeof onAnnotate === "function") {
      onAnnotate(selectedFrames);
    }
    navigate("/annotation", { state: { selectedFrames } });
  };

  return (
    <div className="upload-section">
      <h2>Upload Video</h2>
      <div
        className={`upload-area ${isDragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadAreaClick}
      >
        <p>
          {file
            ? `Selected file: ${file.name}`
            : "Drag and drop a video file here, or click to select a file."}
        </p>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
      </div>
      {uploadProgress > 0 && (
        <div className="progress-bar">
          <div
            className="progress"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
      {frames.length > 0 && (
        <div>
          <div className="select-all">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
            />
            <label>Select All</label>
          </div>
          <div className="frame-grid">
            {frames.map((frame, index) => (
              <div key={index} className="frame-item">
                <img
                  src={`http://localhost:5000/frames/${frame}`}
                  alt={`Frame ${index + 1}`}
                  className="frame"
                />
                <p>Frame {index + 1}</p>
                <input
                  type="checkbox"
                  checked={selectedFrames.includes(frame)}
                  onChange={() => handleFrameSelect(frame)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedFrames.length > 0 && (
        <button onClick={handleAnnotate}>Annotate Selected Frames</button>
      )}
    </div>
  );
}

export default UploadVideo;