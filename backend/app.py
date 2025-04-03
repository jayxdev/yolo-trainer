from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import json
from utils.video_processing import extract_frames
from utils.training import train_yolov8  # Import the training function

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

UPLOAD_FOLDER = "data/videos"
FRAME_FOLDER = "data/frames"
ANNOTATIONS_DIR = "data/annotations"
ANNOTATIONS_FILE = os.path.join(ANNOTATIONS_DIR, "annotations.json")
DATASET_PATH = "data"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(FRAME_FOLDER, exist_ok=True)
os.makedirs(ANNOTATIONS_DIR, exist_ok=True)

# Ensure the annotations file exists
if not os.path.exists(ANNOTATIONS_FILE):
    with open(ANNOTATIONS_FILE, "w") as f:
        json.dump({}, f)

# Serve extracted frames
@app.route("/frames/<filename>")
def serve_frame(filename):
    return send_from_directory(FRAME_FOLDER, filename)

@app.route("/upload", methods=["POST"])
def upload_video():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    video_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(video_path)

    frame_count = extract_frames(video_path, FRAME_FOLDER, socketio)

    return jsonify({
        "message": "Video uploaded and frames extracted",
        "frame_count": frame_count,
        "video_path": video_path
    })

@app.route("/annotations", methods=["POST"])
def save_annotations():
    data = request.json
    if not data or "frame" not in data or "annotations" not in data:
        return jsonify({"error": "Invalid data"}), 400

    frame = data["frame"]
    annotations = data["annotations"]

    try:
        # Load latest annotations
        if os.path.exists(ANNOTATIONS_FILE):
            with open(ANNOTATIONS_FILE, "r") as f:
                try:
                    annotations_data = json.load(f)
                except json.JSONDecodeError:
                    annotations_data = {}
        else:
            annotations_data = {}

        # Update annotations
        annotations_data[frame] = annotations

        # Save back to file
        with open(ANNOTATIONS_FILE, "w") as f:
            json.dump(annotations_data, f, indent=4)

        return jsonify({"message": "Annotations saved successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Load Annotations
@app.route("/annotations/<frame>", methods=["GET"])
def get_annotations(frame):
    try:
        with open(ANNOTATIONS_FILE, "r") as f:
            annotations_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        annotations_data = {}

    return jsonify(annotations_data.get(frame, []))

# Handle CORS Preflight for /train
@app.route("/train", methods=["OPTIONS"])
def train_options():
    response = make_response()
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

# Route for training the model
@app.route("/train", methods=["POST"])
def train_model():
    try:
        print("Received request:", request.data)  # Log raw request body
        print("Received JSON:", request.json)     # Log parsed JSON

        data = request.json
        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        # dataset_path = data.get("dataset_path")
        classes = data.get("classes")
        epochs = data.get("epochs", 10)

        # if not dataset_path or not classes:
        #     return jsonify({"error": "Dataset path and classes are required"}), 400

        results = train_yolov8(DATASET_PATH,classes, epochs)
        return jsonify({"message": "Training started successfully", "results": results}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Socket.IO event for connection testing
@socketio.on("connect")
def handle_connect():
    print("Client connected")
    emit("connected", {"message": "Connected to backend"})

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
