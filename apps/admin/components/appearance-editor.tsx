"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type BackgroundType = "gradient" | "image" | "solid";
type BackgroundFit = "cover" | "contain" | "stretch" | "responsive";

type Appearance = {
  id: string;
  backgroundType: BackgroundType;
  backgroundImageUrl: string | null;
  backgroundOverlay: number;
  backgroundBlur: number;
  glassOpacity: number;
  accentColor: string;
  backgroundPosition: string;
  backgroundFit: BackgroundFit;
  createdAt: string;
  updatedAt: string;
};

type UploadResult = { url: string };

function apiBaseUrl() {
  if (typeof window === "undefined") return "http://localhost:4000/api/v1";
  return `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
}
function resolveUploadUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("blob:")) return value;

  try {
    const parsed = new URL(value);
    if (
      ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) &&
      parsed.pathname.startsWith("/api/v1/uploads/")
    ) {
      return `${apiBaseUrl().replace(/\/api\/v1$/, "")}${parsed.pathname}`;
    }
    return value;
  } catch {
    return `${apiBaseUrl().replace(/\/api\/v1$/, "")}${value}`;
  }
}
const MAX_BACKGROUND_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function AppearanceEditor() {
  const [type, setType] = useState<BackgroundType>("gradient");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(55);
  const [blur, setBlur] = useState(0);
  const [glass, setGlass] = useState(14);
  const [accent, setAccent] = useState("#8B7CFF");
  const [position, setPosition] = useState("center");
  const [fit, setFit] = useState<BackgroundFit>("cover");
  const [status, setStatus] = useState("Loading from API…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${apiBaseUrl()}/appearance`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const value = (await response.json()) as Appearance;
        if (cancelled) return;
        setType(value.backgroundType);
        setImageUrl(value.backgroundImageUrl ?? "");
        setOverlay(Math.round(value.backgroundOverlay * 100));
        setBlur(value.backgroundBlur);
        setGlass(Math.round(value.glassOpacity * 100));
        setAccent(value.accentColor);
        setPosition(value.backgroundPosition);
        setFit(value.backgroundFit ?? "cover");
        setStatus("Loaded from PostgreSQL");
      } catch {
        if (!cancelled) setStatus("Cannot reach Elyra API on port 4000");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const effectiveImageUrl = localPreviewUrl || resolveUploadUrl(imageUrl);
  const preview = useMemo(
    () =>
      type === "image"
        ? effectiveImageUrl
          ? `url(${JSON.stringify(effectiveImageUrl)})`
          : "linear-gradient(135deg,#111827,#05070d)"
        : type === "solid"
          ? "#09101f"
          : "radial-gradient(circle at 72% 24%,#334a78,#17243f 32%,#080d18 72%)",
    [effectiveImageUrl, type],
  );

  function chooseBackground(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setSelectedFile(null);
      setStatus("Choose a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      setSelectedFile(null);
      setStatus("Background image must be 8 MB or smaller");
      return;
    }
    setSelectedFile(file);
    setType("image");
    setStatus(`${file.name} selected · save to upload`);
  }

  async function uploadSelectedBackground(): Promise<string> {
    if (!selectedFile) return imageUrl.trim();
    setStatus("Uploading background…");
    const form = new FormData();
    form.append("file", selectedFile);
    const response = await fetch(`${apiBaseUrl()}/uploads/background`, { method: "POST", body: form });
    const value = (await response.json()) as UploadResult | { message?: string | string[] };
    if (!response.ok || !("url" in value)) {
      const message = "message" in value ? value.message : undefined;
      throw new Error(Array.isArray(message) ? message.join(", ") : message || "Upload failed");
    }
    return value.url;
  }

  async function removeBackground() {
    setSaving(true);
    setStatus("Removing background…");

    try {
      const response = await fetch(`${apiBaseUrl()}/appearance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundType: "gradient",
          backgroundImageUrl: null,
          backgroundOverlay: overlay / 100,
          backgroundBlur: blur,
          glassOpacity: glass / 100,
          accentColor: accent,
          backgroundPosition: position,
          backgroundFit: fit,
        }),
      });

      const value = (await response.json()) as Appearance | { message?: string | string[] };
      if (!response.ok) {
        const message = "message" in value ? value.message : undefined;
        throw new Error(Array.isArray(message) ? message.join(", ") : message || "Remove failed");
      }

      const saved = value as Appearance;
      setType(saved.backgroundType);
      setImageUrl("");
      setSelectedFile(null);
      setStatus(`Background removed · ${new Date(saved.updatedAt).toLocaleTimeString()}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Remove failed");
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("Saving…");

    try {
      const savedImageUrl = type === "image" ? await uploadSelectedBackground() : imageUrl.trim();
      if (type === "image" && !savedImageUrl) {
        throw new Error("Choose a background image before saving Image mode");
      }

      const response = await fetch(`${apiBaseUrl()}/appearance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundType: type,
          backgroundImageUrl: savedImageUrl || null,
          backgroundOverlay: overlay / 100,
          backgroundBlur: blur,
          glassOpacity: glass / 100,
          accentColor: accent,
          backgroundPosition: position,
          backgroundFit: fit,
        }),
      });

      const value = (await response.json()) as Appearance | { message?: string | string[] };
      if (!response.ok) {
        const message = "message" in value ? value.message : undefined;
        throw new Error(Array.isArray(message) ? message.join(", ") : message || "Save failed");
      }

      const saved = value as Appearance;
      setImageUrl(saved.backgroundImageUrl ?? "");
      setSelectedFile(null);
      setStatus(`Saved to PostgreSQL · ${new Date(saved.updatedAt).toLocaleTimeString()}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="appearanceGrid">
      <form className="panel" onSubmit={save}>
        <div className="panelTitle">
          <div><small>APPEARANCE</small><h2>Website atmosphere</h2></div>
          <span className="draft">PostgreSQL</span>
        </div>

        <label>
          Background type
          <select value={type} onChange={(event) => setType(event.target.value as BackgroundType)}>
            <option value="gradient">Gradient</option>
            <option value="solid">Solid color</option>
            <option value="image">Image</option>
          </select>
        </label>

        {type === "image" && (
          <>
            <label>
              Upload background
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => chooseBackground(event.target.files?.[0] ?? null)}
              />
              <em>JPG, PNG or WEBP · maximum 8 MB · stored locally during development.</em>
            </label>
            {imageUrl && !selectedFile && (
              <label>
                Current image URL
                <input value={imageUrl} readOnly />
                <button
                  className="secondary removeBackground"
                  type="button"
                  disabled={saving}
                  onClick={() => void removeBackground()}
                >
                  Remove image
                </button>
                <em>Removes the saved background image and restores the default gradient.</em>
              </label>
            )}
          </>
        )}

        <label>Overlay strength<div className="range"><input type="range" min="0" max="100" value={overlay} onChange={(event) => setOverlay(+event.target.value)} /><b>{overlay}%</b></div></label>
        <label>Background blur<div className="range"><input type="range" min="0" max="40" value={blur} onChange={(event) => setBlur(+event.target.value)} /><b>{blur}px</b></div></label>
        <label>Glass opacity<div className="range"><input type="range" min="0" max="100" value={glass} onChange={(event) => setGlass(+event.target.value)} /><b>{glass}%</b></div></label>

        <label>
          Background fit
          <select value={fit} onChange={(event) => setFit(event.target.value as BackgroundFit)}>
            <option value="cover">Cover · fill screen, may crop</option>
            <option value="contain">Contain · show full image</option>
            <option value="stretch">Stretch · fill screen exactly</option>
            <option value="responsive">Responsive · cover desktop, contain mobile</option>
          </select>
        </label>

        <label>
          Background position
          <select value={position} onChange={(event) => setPosition(event.target.value)}>
            <option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option>
          </select>
        </label>

        <label>Accent color<div className="colorRow"><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /><code>{accent}</code></div></label>

        <div className="actions">
          <span>{status}</span>
          <button className="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save appearance"}</button>
        </div>
      </form>

      <section className="previewPanel">
        <div
          className="preview"
          style={{
            backgroundImage: type === "image" || type === "gradient" ? preview : undefined,
            backgroundColor: type === "solid" ? preview : undefined,
            backgroundSize: type === "image" ? (fit === "stretch" ? "100% 100%" : fit === "contain" ? "contain" : "cover") : undefined,
            backgroundPosition: position,
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="previewBackdrop" style={{ backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)` }} />
          <div className="previewOverlay" style={{ background: `rgba(3,7,15,${overlay / 100})` }} />
          <div className="mini">
            <span>✦ Your Space</span>
            <h3>Good evening.<br /><i>What’s on your mind?</i></h3>
            <div className="miniChat" style={{ backgroundColor: `rgba(16,25,43,${glass / 100})`, backdropFilter: `blur(${Math.round((glass / 100) * 24)}px)`, WebkitBackdropFilter: `blur(${Math.round((glass / 100) * 24)}px)` }}><p>Hi. I’m here to listen.</p><div className="miniInput">Message… <b style={{ background: accent }}>↑</b></div></div>
          </div>
        </div>
        <p className="caption">Live preview · saved values are persisted by the Elyra API</p>
      </section>
    </div>
  );
}
