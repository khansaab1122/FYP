# Smart Khata AI — Final Face Recognition Integration

Smart Khata AI now uses a **local Python computer-vision service** for face verification. Gemini is not required for face recognition.

## Technology

- React + TypeScript frontend
- Node.js + Express backend
- MongoDB Atlas database
- Python FastAPI service
- OpenCV YuNet for face detection
- OpenCV SFace for face embeddings and cosine similarity

## How to run

### 1. Configure Node environment

Copy `.env.example` to `.env.local` and add your own MongoDB Atlas connection string. Do not commit `.env.local`.

### 2. Start Python face service

Open PowerShell in the project root:

```powershell
.\start-face-service.ps1
```

The service listens on `http://127.0.0.1:8001`.

Check:

```text
http://127.0.0.1:8001/health
```

### 3. Start Smart Khata

In a second PowerShell window:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Face recognition flow

1. Register a customer and capture/upload a clear front-facing photo.
2. The image is stored with that customer record in MongoDB/local DB.
3. During scanning, the browser captures a JPEG image.
4. Node.js sends the captured image and registered customer images to the local Python service.
5. YuNet detects a face.
6. SFace creates a face embedding for the captured and reference faces.
7. Cosine similarity is calculated for every registered customer.
8. The best score is compared with the configured threshold.
9. Node.js returns the matched customer ID to React.
10. The existing confirmation flow opens the customer's ledger.

## Threshold

`FACE_MATCH_THRESHOLD` can be set in the Python process environment. The default is `0.363`, the commonly documented cosine threshold for SFace. This is a similarity threshold, not a calibrated probability. For your thesis, measure the system on your own test set and report the resulting accuracy, false acceptance rate, and false rejection rate rather than claiming an unsupported percentage.

## Security/privacy

Face images are sensitive biometric data. Keep the service on localhost unless you have a secured deployment. Protect the database, use HTTPS for production, obtain appropriate consent, and do not expose the Python endpoint publicly.
