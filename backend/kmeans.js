// 1D K-Means clustering (deterministic quantile initialisation)
function kmeans1D(values, k = 3, maxIter = 100) {
  const data = values.map(Number).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (data.length === 0) return [];
  const uniq = [...new Set(data)];
  const kk = Math.min(k, uniq.length); // can't have more clusters than distinct values

  // init centroids spread across distinct sorted values
  let centroids = Array.from({ length: kk }, (_, i) =>
    uniq[Math.round((i * (uniq.length - 1)) / Math.max(kk - 1, 1))]
  );

  let labels = new Array(data.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    // assignment
    let changed = false;
    data.forEach((v, i) => {
      let best = 0;
      for (let c = 1; c < kk; c++) {
        if (Math.abs(v - centroids[c]) < Math.abs(v - centroids[best])) best = c;
      }
      if (labels[i] !== best) { labels[i] = best; changed = true; }
    });
    // update
    const next = centroids.map((old, c) => {
      const members = data.filter((_, i) => labels[i] === c);
      return members.length ? members.reduce((s, x) => s + x, 0) / members.length : old;
    });
    const moved = next.some((c, i) => c !== centroids[i]);
    centroids = next;
    if (!changed && !moved && iter > 0) break;
  }

  return centroids
    .map((centroid, c) => ({ centroid, count: labels.filter((l) => l === c).length }))
    .filter((cl) => cl.count > 0)
    .sort((a, b) => a.centroid - b.centroid)
    .map((cl, i) => ({ group: `Tier ${i + 1}`, centroid: Math.round(cl.centroid), count: cl.count }));
}

module.exports = { kmeans1D };
