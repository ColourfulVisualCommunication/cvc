import { useEffect, useState } from "react";

import {
  adminListClientLogos,
  adminCreateClientLogo,
  adminUpdateClientLogo,
  adminDeleteClientLogo,
  uploadLogo,
} from "../../api/client.js";
import ImageUploadField from "../../admin/ImageUploadField.jsx";

const EMPTY = { name: "", logo_url: "", published: false, sort_order: 0 };
const inputClass = "mt-1 w-full border border-black/15 px-3 py-2 outline-none focus:border-cvc-ink";

export default function ClientLogosAdmin() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    adminListClientLogos().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    if (!editing.logo_url) {
      setError("Upload a logo file first.");
      return;
    }
    try {
      if (editing.id) {
        await adminUpdateClientLogo(editing.id, editing);
      } else {
        await adminCreateClientLogo(editing);
      }
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this client logo?")) return;
    await adminDeleteClientLogo(id);
    refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold">{editing.id ? "Edit client logo" : "New client logo"}</h1>

        <div>
          <label className="text-sm font-medium text-cvc-ink">Client name</label>
          <input
            required
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-cvc-muted">Used as the image's alt text — not shown as a label.</p>
        </div>

        <ImageUploadField
          label="Logo (SVG or PNG only)"
          value={editing.logo_url}
          onChange={(url) => setEditing({ ...editing, logo_url: url })}
          accept=".svg,.png,image/svg+xml,image/png"
          upload={uploadLogo}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={editing.published}
            onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
          />
          Published (visible on the public site)
        </label>

        {error && <p className="text-sm text-cvc-crimson">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" className="bg-cvc-ink px-4 py-2 font-semibold text-cvc-paper">Save</button>
          <button type="button" onClick={() => setEditing(null)} className="text-sm text-cvc-muted">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Client logos</h1>
        <button onClick={() => setEditing({ ...EMPTY })} className="bg-cvc-ink px-4 py-2 text-sm font-semibold text-cvc-paper">
          New logo
        </button>
      </div>

      <div className="mt-6 divide-y divide-black/10">
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4">
              <img src={c.logo_url} alt="" className="h-10 w-16 object-contain" />
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-cvc-muted">{c.published ? "published" : "draft"}</p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setEditing(c)} className="text-cvc-ink underline">Edit</button>
              <button onClick={() => handleDelete(c.id)} className="text-cvc-crimson">Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No client logos yet.</p>}
      </div>
    </div>
  );
}
