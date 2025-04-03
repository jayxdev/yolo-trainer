import cv2
import os

def extract_frames(video_path, output_dir, socketio, frame_interval=30):
    try:
        vidcap = cv2.VideoCapture(video_path)
        total_frames = int(vidcap.get(cv2.CAP_PROP_FRAME_COUNT))
        success, image = vidcap.read()
        count = 0
        frame_count = 0
        frames = []

        while success:
            if count % frame_interval == 0:
                frame_path = os.path.join(output_dir, f"frame_{frame_count}.jpg")
                cv2.imwrite(frame_path, image)
                frames.append(f"frame_{frame_count}.jpg")
                frame_count += 1

                # Emit progress update
                progress = int((count / total_frames) * 100)
                socketio.emit("frame_progress", {"progress": progress})

            success, image = vidcap.read()
            count += 1

        # Emit frames extracted event
        socketio.emit("frames_extracted", {"frames": frames})

        return frame_count
    except Exception as e:
        print("Frame extraction error:", e)  # Debugging line
        socketio.emit("frame_extraction_error", {"error": str(e)})
        return 0