from __future__ import annotations

import base64
import os
from pathlib import Path
from threading import Lock
from typing import Any
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
YUNET_MODEL = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
SFACE_MODEL = MODEL_DIR / "face_recognition_sface_2021dec.onnx"
THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.363"))

app = FastAPI(title="Smart Khata Face Recognition Service", version="1.0.0")

_detector = None
_recognizer = None
_model_lock = Lock()


class Reference(BaseModel):
    customerId: str
    image: str = Field(min_length=20)


class VerifyRequest(BaseModel):
    image: str = Field(min_length=20)
    references: list[Reference] = Field(default_factory=list)


def decode_image(data_uri: str) -> np.ndarray:
    try:
        raw = data_uri.split(",", 1)[1] if "," in data_uri else data_uri
        data = base64.b64decode(raw, validate=False)
        image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("OpenCV could not decode image")
        return image
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {exc}") from exc


def load_models() -> None:
    global _detector, _recognizer
    if not YUNET_MODEL.exists() or not SFACE_MODEL.exists():
        raise RuntimeError(
            "Face models are missing. Run python download_models.py from python_face_service."
        )
    _detector = cv2.FaceDetectorYN.create(
        str(YUNET_MODEL), "", (320, 320), 0.90, 0.30, 5000
    )
    _recognizer = cv2.FaceRecognizerSF.create(str(SFACE_MODEL), "")


def detector():
    if _detector is None or _recognizer is None:
        load_models()
    return _detector, _recognizer


def get_faces(image: np.ndarray) -> list[tuple[np.ndarray, np.ndarray]]:
    # OpenCV's YuNet and SFace instances keep mutable internal DNN state.
    # Serialize access because FastAPI can process camera frames concurrently.
    with _model_lock:
        det, rec = detector()
        height, width = image.shape[:2]
        det.setInputSize((width, height))
        _, faces = det.detect(image)
        if faces is None or len(faces) == 0:
            return []

        results = []
        for face in faces:
            aligned = rec.alignCrop(image, face)
            feature = rec.feature(aligned)
            results.append((feature, face))
        return results


def cosine_similarity(rec, a: np.ndarray, b: np.ndarray) -> float:
    with _model_lock:
        return float(rec.match(a, b, cv2.FaceRecognizerSF_FR_COSINE))


def verify(req: VerifyRequest) -> dict[str, Any]:
    if not req.references:
        return {
            "matchFound": False,
            "matchedCustomerId": None,
            "confidenceScore": 0,
            "detectedFaceCount": 0,
            "faces": [],
            "matchedCustomers": [],
            "analysis": "No registered customer face references were found.",
            "engine": "OpenCV YuNet + SFace",
        }

    det, rec = detector()
    captured = decode_image(req.image)
    captured_faces = get_faces(captured)
    if not captured_faces:
        return {
            "matchFound": False,
            "matchedCustomerId": None,
            "confidenceScore": 0,
            "detectedFaceCount": 0,
            "faces": [],
            "matchedCustomers": [],
            "analysis": "No face detected. Keep faces clearly visible in the camera frame.",
            "engine": "OpenCV YuNet + SFace",
        }

    reference_features = []
    valid_count = 0
    for ref in req.references:
        try:
            reference = decode_image(ref.image)
            reference_faces = get_faces(reference)
            if not reference_faces:
                continue
            reference_feature, _ = max(reference_faces, key=lambda item: float(item[1][-1]))
            reference_features.append((ref.customerId, reference_feature))
            valid_count += 1
        except Exception:
            continue

    if valid_count == 0:
        return {
            "matchFound": False,
            "matchedCustomerId": None,
            "confidenceScore": 0,
            "detectedFaceCount": len(captured_faces),
            "faces": [],
            "matchedCustomers": [],
            "analysis": "Registered face images could not be processed. Re-register a clear face photo.",
            "engine": "OpenCV YuNet + SFace",
        }

    detected_results = []
    for index, (captured_feature, face) in enumerate(captured_faces):
        best_id = None
        best_score = -1.0
        for customer_id, reference_feature in reference_features:
            score = cosine_similarity(rec, captured_feature, reference_feature)
            if score > best_score:
                best_score = score
                best_id = customer_id

        matched = best_id is not None and best_score >= THRESHOLD
        confidence = max(0, min(100, round(best_score * 100)))
        detected_results.append({
            "faceIndex": index,
            "matchedCustomerId": best_id if matched else None,
            "matchFound": matched,
            "confidenceScore": confidence,
            "similarityScore": round(best_score, 4),
            "boundingBox": [int(value) for value in face[:4]],
        })

    matched_results = [result for result in detected_results if result["matchFound"]]
    best_result = max(matched_results or detected_results, key=lambda result: result["similarityScore"])
    matched = bool(matched_results)
    return {
        "matchFound": matched,
        "matchedCustomerId": best_result["matchedCustomerId"],
        "confidenceScore": best_result["confidenceScore"],
        "similarityScore": best_result["similarityScore"],
        "threshold": THRESHOLD,
        "detectedFaceCount": len(detected_results),
        "matchedCustomers": [
            {
                "customerId": result["matchedCustomerId"],
                "confidenceScore": result["confidenceScore"],
                "boundingBox": result["boundingBox"],
            }
            for result in matched_results
        ],
        "faces": detected_results,
        "analysis": (
            f"{len(matched_results)} of {len(detected_results)} faces matched using OpenCV SFace embeddings."
            if matched
            else f"Detected {len(detected_results)} faces, but no reliable face match was found."
        ),
        "engine": "OpenCV YuNet + SFace",
    }


@app.on_event("startup")
def startup() -> None:
    load_models()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "smart-khata-face-recognition",
        "engine": "OpenCV YuNet + SFace",
        "modelsReady": YUNET_MODEL.exists() and SFACE_MODEL.exists(),
        "threshold": THRESHOLD,
    }


@app.post("/verify")
def verify_face(req: VerifyRequest) -> dict[str, Any]:
    return verify(req)
