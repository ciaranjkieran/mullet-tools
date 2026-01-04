export function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function formatSeconds(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
