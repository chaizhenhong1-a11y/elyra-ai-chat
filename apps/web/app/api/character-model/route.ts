import {readFile} from "node:fs/promises";
import {gzipSync} from "node:zlib";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let compressedModel: Buffer | null = null;

export async function GET(request: Request) {
  if (!compressedModel) {
    const modelPath = path.join(
      process.cwd(),
      "public",
      "models",
      "templates",
      "elyra-template-male-01.vrm",
    );
    const original = await readFile(modelPath);
    compressedModel = gzipSync(original, {level: 6});
  }

  const etag = `"elyra-male-01-gzip-${compressedModel.length}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new Response(new Uint8Array(compressedModel), {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Content-Encoding": "gzip",
      "Content-Length": String(compressedModel.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
      Vary: "Accept-Encoding",
    },
  });
}
