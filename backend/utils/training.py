import os
import json
import cv2
import logging
from ultralytics import YOLO
import yaml

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def convert_annotations(json_path, images_folder, output_folder, class_mapping):
    """
    Converts JSON annotations to YOLO format.

    Args:
        json_path (str): Path to JSON annotation file.
        images_folder (str): Path to folder containing images.
        output_folder (str): Path to save YOLO format annotations.
        class_mapping (dict): Mapping of class names to YOLO class IDs.

    Raises:
        FileNotFoundError: If JSON or image folder is missing.
    """
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Annotation file '{json_path}' not found!")
    if not os.path.exists(images_folder):
        raise FileNotFoundError(f"Images folder '{images_folder}' not found!")

    os.makedirs(output_folder, exist_ok=True)  # Ensure output folder exists

    # Load annotation JSON
    with open(json_path, "r") as f:
        annotations = json.load(f)

    for img_name, objects in annotations.items():
        img_path = os.path.join(images_folder, img_name)
        label_path = os.path.join(output_folder, os.path.splitext(img_name)[0] + ".txt")

        if not os.path.exists(img_path):
            logging.warning(f"⚠️ Image {img_name} not found! Skipping...")
            continue

        # Get image dimensions
        img = cv2.imread(img_path)
        h, w, _ = img.shape

        with open(label_path, "w") as label_file:
            for obj in objects:
                x_center = (obj["x"] + obj["width"] / 2) / w
                y_center = (obj["y"] + obj["height"] / 2) / h
                width = obj["width"] / w
                height = obj["height"] / h

                class_id = class_mapping.get(obj["class"], -1)
                if class_id == -1:
                    logging.warning(f"⚠️ Class '{obj['class']}' not in mapping! Skipping...")
                    continue

                label_file.write(f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}\n")

        logging.info(f"✅ Converted {img_name} → {label_path}")


def create_dataset_config(dataset_path, class_names):
    """
    Creates a dataset.yaml file for YOLOv8 training.

    Args:
        dataset_path (str): Path to dataset folder.
        class_names (list): List of class names.
    """
    config = {
        "train": os.path.abspath(os.path.join(dataset_path, "yolo/train/images")),
        "val": os.path.abspath(os.path.join(dataset_path, "yolo/valid/images")),
        "nc": len(class_names),
        "names": class_names
    }

    config_path = os.path.join(dataset_path, "dataset.yaml")
    with open(config_path, "w") as f:
        yaml.safe_dump(config, f, default_flow_style=False)

    logging.info(f"✅ dataset.yaml created at {config_path}")


def train_yolov8(dataset_path, class_names, epochs=10, batch_size=8, img_size=640):
    """
    Trains YOLOv8 on the dataset.

    Args:
        dataset_path (str): Path to dataset.
        class_names (list): List of class names.
        epochs (int): Number of training epochs.
        batch_size (int): Batch size.
        img_size (int): Image size.
    """
    frames_folder = os.path.join(dataset_path, "frames")
    annotation_file = os.path.join(dataset_path, "annotation", "annotations.json")
    class_mapping = {name: i for i, name in enumerate(class_names)}
    # Convert annotations
    convert_annotations(annotation_file, frames_folder, os.path.join(dataset_path, "yolo/train/labels"), class_mapping)
    convert_annotations(annotation_file, frames_folder, os.path.join(dataset_path, "yolo/valid/labels"), class_mapping)
    try:
        create_dataset_config(dataset_path, class_names)
        model = YOLO("yolov8n.pt")

        logging.info("🚀 Starting training...")
        results = model.train(
            data=os.path.join(dataset_path, "dataset.yaml"),
            epochs=epochs,
            imgsz=img_size,
            batch=batch_size,
            name="custom_training"
        )

        logging.info("✅ Training completed!")
        return results

    except Exception as e:
        logging.error(f"❌ Training error: {e}")
        return None
