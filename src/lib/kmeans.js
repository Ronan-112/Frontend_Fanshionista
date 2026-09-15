/**
 * Minimal k-means clustering over RGB pixel samples.
 * Used to find the dominant skin color from a sampled face region,
 * then mapped to a skin-tone category via luminance + undertone heuristics.
 */

function distSq(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export function kmeans(points, k = 3, maxIterations = 15) {
  if (points.length === 0) return { centroids: [], assignments: [] };
  if (points.length < k) k = points.length;

  // k-means++ style seeding for more stable convergence than pure random init
  const centroids = [points[Math.floor(Math.random() * points.length)]];
  while (centroids.length < k) {
    const distances = points.map((p) =>
      Math.min(...centroids.map((c) => distSq(p, c)))
    );
    const total = distances.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < distances.length; idx++) {
      r -= distances[idx];
      if (r <= 0) break;
    }
    centroids.push(points[Math.min(idx, points.length - 1)]);
  }

  let assignments = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // Assign step
    for (let i = 0; i < points.length; i++) {
      let bestDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < centroids.length; c++) {
        const d = distSq(points[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestCluster = c;
        }
      }
      if (assignments[i] !== bestCluster) changed = true;
      assignments[i] = bestCluster;
    }

    // Update step
    const sums = Array.from({ length: centroids.length }, () => [0, 0, 0, 0]);
    for (let i = 0; i < points.length; i++) {
      const c = assignments[i];
      sums[c][0] += points[i][0];
      sums[c][1] += points[i][1];
      sums[c][2] += points[i][2];
      sums[c][3] += 1;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c][3] > 0) {
        centroids[c] = [
          sums[c][0] / sums[c][3],
          sums[c][1] / sums[c][3],
          sums[c][2] / sums[c][3],
        ];
      }
    }

    if (!changed) break;
  }

  // Cluster sizes, largest first — the largest cluster of sampled face
  // pixels is assumed to be skin (small clusters tend to be shadow/highlight/hair).
  const counts = new Array(centroids.length).fill(0);
  assignments.forEach((a) => counts[a]++);
  const order = counts
    .map((count, idx) => ({ count, idx }))
    .sort((a, b) => b.count - a.count);

  return {
    centroids,
    assignments,
    dominantCentroid: centroids[order[0].idx],
    order,
  };
}

/**
 * Maps an RGB centroid to one of three skin-tone categories used by the
 * recommendation engine, based on relative luminance.
 * This is a simplification — real skin-tone science (e.g. Fitzpatrick /
 * Monk scales) is far richer, but this gives a usable, explainable signal.
 */
export function classifySkinTone([r, g, b]) {
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  let category;
  if (luminance > 180) category = "fair";
  else if (luminance > 120) category = "wheatish";
  else category = "dusky";

  return { category, luminance: Math.round(luminance), rgb: [Math.round(r), Math.round(g), Math.round(b)] };
}

/**
 * Samples pixels from a canvas region (expected to be a cropped face area)
 * at a stride to keep the point count k-means-friendly, and filters out
 * likely non-skin pixels (too dark/black backgrounds, or near-white
 * blown-out highlights) before clustering.
 */
export function samplePixelsFromCanvas(ctx, x, y, w, h, stride = 4) {
  const imageData = ctx.getImageData(x, y, w, h);
  const { data } = imageData;
  const points = [];

  for (let py = 0; py < h; py += stride) {
    for (let px = 0; px < w; px += stride) {
      const i = (py * w + px) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 200) continue;
      const brightness = (r + g + b) / 3;
      if (brightness < 20 || brightness > 250) continue; // skip near-black/near-white outliers
      points.push([r, g, b]);
    }
  }
  return points;
}
