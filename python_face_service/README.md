# Smart Khata AI — Python Face Recognition

This service provides offline face verification for Smart Khata AI using local computer-vision models.

## Engine

- OpenCV YuNet: face detection
- OpenCV SFace: face embeddings and cosine similarity
- FastAPI + Uvicorn: local HTTP service

## Windows setup

Recommended: Python 3.12.

```powershell
cd python_face_service
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python download_models.py
python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

Or run `start.ps1`.

Health check: `http://127.0.0.1:8001/health`

## API

`POST /verify`

```json
{
  "image": "data:image/jpeg;base64,...",
  "references": [
    {"customerId": "cust_123", "image": "data:image/jpeg;base64,..."}
  ]
}
```

The response contains the backward-compatible best-match fields `matchFound`, `matchedCustomerId`, `confidenceScore`, and `similarityScore`. For multi-face frames, `detectedFaceCount` reports the number of detected faces and `faces` contains one result per detected face, including its `boundingBox`, match status, matched customer ID, and similarity score.

## Important

The threshold is configurable with `FACE_MATCH_THRESHOLD`. Test it with your own registration/camera conditions before claiming a specific accuracy in the thesis.
