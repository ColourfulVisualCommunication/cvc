import { useState } from "react";

import { uploadMedia, ApiError } from "../api/client.js";

export default function ImageUploadField({
  label,
  value,
  onChange,
  accept = "image/*",
  upload = uploadMedia,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const media = await upload(file);
      onChange(media.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-cvc-ink">{label}</label>
      {value && (
        <img src={value} alt="" className="mt-2 h-32 w-32 rounded-lg object-contain" />
      )}
      <input
        type="file"
        accept={accept}
        onChange={handleFile}
        disabled={busy}
        className="mt-2 block text-sm text-cvc-muted"
      />
      {busy && <p className="mt-1 text-xs text-cvc-muted">Uploading…</p>}
      {error && <p className="mt-1 text-xs text-cvc-crimson">{error}</p>}
    </div>
  );
}
