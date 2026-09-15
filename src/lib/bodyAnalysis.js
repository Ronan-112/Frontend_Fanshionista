/**
 * Turns MediaPipe Pose landmarks into a simplified body-type category.
 *
 * This is a heuristic, not a medical or highly precise measurement —
 * real body-type classification from a single 2D photo has inherent
 * limits (camera angle, pose, clothing). It gives a *reasonable starting
 * signal* that the user can always override manually.
 *
 * MediaPipe Pose landmark indices used:
 *  11: left shoulder   12: right shoulder
 *  23: left hip        24: right hip
 *  0:  nose (used with ankles for a rough height-in-pixels reference)
 *  27: left ankle      28: right ankle
 */
export function estimateBodyType(landmarks) {
  if (!landmarks || landmarks.length < 29) return null;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const shoulderWidth = Math.hypot(
    rightShoulder.x - leftShoulder.x,
    rightShoulder.y - leftShoulder.y
  );
  const hipWidth = Math.hypot(
    rightHip.x - leftHip.x,
    rightHip.y - leftHip.y
  );

  const shoulderHipRatio = shoulderWidth / hipWidth;

  // Waist approximated as the midpoint between shoulders and hips (MediaPipe
  // Pose doesn't have a dedicated waist landmark).
  const waistWidthEstimate = (shoulderWidth + hipWidth) / 2 * 0.85;
  const waistToHip = waistWidthEstimate / hipWidth;
  const waistToShoulder = waistWidthEstimate / shoulderWidth;

  let bodyType;
  let confidence = "medium";

  if (shoulderHipRatio > 1.15) {
    bodyType = "athletic"; // shoulders notably broader than hips
  } else if (shoulderHipRatio < 0.85) {
    bodyType = "pear"; // hips notably broader than shoulders
  } else if (waistToHip < 0.75 && waistToShoulder < 0.75) {
    bodyType = "hourglass"; // defined waist relative to both shoulder and hip
  } else if (shoulderHipRatio >= 0.95 && shoulderHipRatio <= 1.05 && waistToHip > 0.85) {
    bodyType = "rectangle"; // balanced shoulder/hip, little waist definition
  } else if (shoulderHipRatio >= 1.05 && shoulderHipRatio <= 1.15) {
    bodyType = "broad";
  } else {
    bodyType = "rectangle";
    confidence = "low";
  }

  return {
    bodyType,
    confidence,
    metrics: {
      shoulderHipRatio: Number(shoulderHipRatio.toFixed(2)),
      waistToHip: Number(waistToHip.toFixed(2)),
    },
  };
}

/** Returns the pixel-space bounding box for a rough face region, used to sample skin pixels. */
export function estimateFaceRegion(landmarks, canvasWidth, canvasHeight) {
  if (!landmarks || landmarks.length < 11) return null;
  const nose = landmarks[0];
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const eyeDist = Math.hypot(
    (rightEye.x - leftEye.x) * canvasWidth,
    (rightEye.y - leftEye.y) * canvasHeight
  );
  const shoulderY = ((leftShoulder.y + rightShoulder.y) / 2) * canvasHeight;
  const noseX = nose.x * canvasWidth;
  const noseY = nose.y * canvasHeight;

  const halfWidth = eyeDist * 1.8;
  const top = Math.max(0, noseY - eyeDist * 2.2);
  const bottom = Math.min(canvasHeight, Math.min(shoulderY, noseY + eyeDist * 1.6));

  return {
    x: Math.max(0, noseX - halfWidth),
    y: top,
    width: Math.min(canvasWidth, halfWidth * 2),
    height: Math.max(10, bottom - top),
  };
}
