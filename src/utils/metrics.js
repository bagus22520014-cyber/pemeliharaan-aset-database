// Simple JSON metrics emitter for logs/metrics collection
export function emitMetric(name, value = 1, labels = {}) {
  const rec = {
    ts: new Date().toISOString(),
    name,
    value,
    labels,
  };
  // emit as single-line JSON to stdout so log aggregators can parse
  try {
    console.log("[METRIC] " + JSON.stringify(rec));
  } catch (e) {
    // swallow
  }
}

export default { emitMetric };
