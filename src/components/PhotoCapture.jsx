import { useRef, useState, useCallback } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { estimateBodyType, estimateFaceRegion } from "../lib/bodyAnalysis";
import { kmeans, classifySkinTone, samplePixelsFromCanvas } from "../lib/kmeans";

let poseLandmarkerPromise = null;

/** Lazily loads and caches the MediaPipe Pose Landmarker (downloads the pretrained model once). */
function getPoseLandmarker() {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
      });
    })();
  }
  return poseLandmarkerPromise;
}

export default function PhotoCapture({ onAnalysisComplete }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const canvasRef = useRef(null);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setStatus("loading");
      setErrorMsg("");
      setResult(null);

      try {
        const imageUrl = URL.createObjectURL(file);
        setPreview(imageUrl);

        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });

        const canvas = canvasRef.current;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const landmarker = await getPoseLandmarker();
        const poseResult = landmarker.detect(img);

        if (!poseResult.landmarks || poseResult.landmarks.length === 0) {
          throw new Error(
            "Couldn't detect a full body pose in this photo. Try a well-lit, front-facing photo showing your shoulders and hips clearly."
          );
        }

        const landmarks = poseResult.landmarks[0];
        const bodyAnalysis = estimateBodyType(landmarks);

        const faceRegion = estimateFaceRegion(landmarks, canvas.width, canvas.height);
        let skinTone = null;
        if (faceRegion && faceRegion.width > 4 && faceRegion.height > 4) {
          const points = samplePixelsFromCanvas(
            ctx,
            Math.round(faceRegion.x),
            Math.round(faceRegion.y),
            Math.round(faceRegion.width),
            Math.round(faceRegion.height),
            3
          );
          if (points.length > 10) {
            const { dominantCentroid } = kmeans(points, 3);
            skinTone = classifySkinTone(dominantCentroid);
          }
        }

        const analysis = {
          bodyType: bodyAnalysis?.bodyType ?? null,
          bodyConfidence: bodyAnalysis?.confidence ?? "low",
          bodyMetrics: bodyAnalysis?.metrics ?? null,
          skinTone: skinTone?.category ?? null,
          skinToneDetail: skinTone ?? null,
        };

        setResult(analysis);
        setStatus("done");
        onAnalysisComplete?.(analysis);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || "Something went wrong analyzing this photo.");
        setStatus("error");
      }
    },
    [onAnalysisComplete]
  );

  return (
    <div className="photo-capture">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <label className="upload-drop" htmlFor="photo-input">
        {preview ? (
          <img src={preview} alt="Uploaded preview" className="upload-preview" />
        ) : (
          <div className="upload-placeholder">
            <span className="upload-icon">◐</span>
            <p>Upload a front-facing, well-lit photo</p>
            <p className="upload-hint">Shoulders and hips visible works best</p>
          </div>
        )}
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
          hidden
        />
      </label>

      {status === "loading" && (
        <p className="status-line status-loading">Analyzing body proportions and skin tone…</p>
      )}
      {status === "error" && <p className="status-line status-error">{errorMsg}</p>}
      {status === "done" && result && (
        <div className="analysis-result">
          <div className="analysis-row">
            <span className="analysis-label">Detected build</span>
            <span className="analysis-value">{result.bodyType ?? "Not detected"}</span>
          </div>
          <div className="analysis-row">
            <span className="analysis-label">Detected skin tone</span>
            <span className="analysis-value">
              {result.skinTone ?? "Not detected"}
              {result.skinToneDetail && (
                <span
                  className="swatch"
                  style={{
                    backgroundColor: `rgb(${result.skinToneDetail.rgb.join(",")})`,
                  }}
                />
              )}
            </span>
          </div>
          <p className="analysis-note">
            These are estimates from your photo — feel free to adjust them in the form below if they don't feel right.
          </p>
        </div>
      )}
    </div>
  );
}
