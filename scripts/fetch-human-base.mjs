import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";

const url = "https://www.innerscene.com/api/library/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1/download";
const out = path.resolve("apps/admin/public/models/human-base-rigged.glb");
await mkdir(path.dirname(out), {recursive: true});
console.log("Downloading CC0 human base mesh…");
const response = await fetch(url, {headers: {"User-Agent": "Elyra development asset fetcher"}});
if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length < 100000) throw new Error(`Unexpectedly small GLB (${bytes.length} bytes)`);
await writeFile(out, bytes);
console.log(`Saved ${Math.round(bytes.length / 1024 / 1024 * 10) / 10} MB → ${out}`);
console.log("Source: Innerscene Human base mesh with editable 53-bone rig (CC0). Development base asset only.");
