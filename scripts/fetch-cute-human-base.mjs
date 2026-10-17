import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = "https://raw.githubusercontent.com/programasweights/avatar/main/public/assets/character.glb";
const output = resolve("apps/admin/public/models/cute-human-base.glb");

console.log("Downloading Elyra cute stylized human base…");
const response = await fetch(source);
if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
const bytes = Buffer.from(await response.arrayBuffer());
await mkdir(dirname(output), { recursive: true });
await writeFile(output, bytes);
console.log(`Saved ${(bytes.length / 1024 / 1024).toFixed(2)} MB → ${output}`);
console.log("Source: Quaternius Universal Base Characters / packaged by programasweights/avatar (CC0 1.0).")
console.log("Elyra applies its cute/chibi proportions at runtime; this is the editable rigged base, not a photoreal human.");
