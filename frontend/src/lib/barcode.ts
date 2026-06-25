// Real, scannable Code 128-B barcode generation as pure SVG — no external library.
// Pattern table is the canonical Code 128 module-width set (index 0..106 + stop).

const PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112",
];
const START_B = 104;
const STOP = 106;

/** Returns the full module-width string (alternating bar/space, starting with a bar). */
function code128bModules(text: string): string {
  const clean = text.replace(/[^\x20-\x7e]/g, "");
  const values = [START_B];
  for (const ch of clean) values.push(ch.charCodeAt(0) - 32);
  let checksum = START_B;
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  values.push(checksum % 103);
  values.push(STOP);
  return values.map((v) => PATTERNS[v]).join("");
}

/** Build an SVG <rect> string for a Code 128-B barcode of `text`. */
export function code128SVG(
  text: string,
  { height = 56, moduleWidth = 1.6, color = "#231A1F", showText = true }: { height?: number; moduleWidth?: number; color?: string; showText?: boolean } = {},
): { svg: string; rects: { x: number; w: number }[]; totalWidth: number } {
  const modules = code128bModules(text);
  const rects: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < modules.length; i++) {
    const w = parseInt(modules[i], 10) * moduleWidth;
    if (i % 2 === 0) rects.push({ x, w }); // even index = bar
    x += w;
  }
  const totalWidth = x;
  const textH = showText ? 14 : 0;
  const bars = rects.map((r) => `<rect x="${r.x.toFixed(2)}" y="0" width="${r.w.toFixed(2)}" height="${height}" fill="${color}"/>`).join("");
  const label = showText
    ? `<text x="${(totalWidth / 2).toFixed(2)}" y="${height + 11}" font-family="monospace" font-size="11" text-anchor="middle" fill="${color}">${text}</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${height + textH}" width="100%" height="${height + textH}">${bars}${label}</svg>`;
  return { svg, rects, totalWidth };
}
