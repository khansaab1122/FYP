from pathlib import Path
from urllib.request import Request, urlopen

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_DIR.mkdir(exist_ok=True)
MODELS = {
    "face_detection_yunet_2023mar.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "face_recognition_sface_2021dec.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
}

for filename, url in MODELS.items():
    target = MODEL_DIR / filename
    if target.exists() and target.stat().st_size > 100_000:
        print(f"Already downloaded: {filename}")
        continue
    print(f"Downloading {filename} ...")
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=120) as response, open(target, "wb") as output:
        output.write(response.read())
    print(f"Saved: {target}")
