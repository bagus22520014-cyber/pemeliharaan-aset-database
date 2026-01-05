export function computeNext(baseDate, iv, iu) {
  const d = new Date(baseDate);
  if (isNaN(d.getTime())) return null;
  const n = Number(iv);
  if (isNaN(n) || n <= 0) return null;
  if (iu === "day") d.setDate(d.getDate() + n);
  else if (iu === "week") d.setDate(d.getDate() + n * 7);
  else if (iu === "month") d.setMonth(d.getMonth() + n);
  else if (iu === "year") d.setFullYear(d.getFullYear() + n);
  else return null;
  return d.toISOString().split("T")[0];
}

export function addIntervalToDate(baseDate, iv, iu) {
  return computeNext(baseDate, iv, iu);
}

export default { computeNext, addIntervalToDate };
