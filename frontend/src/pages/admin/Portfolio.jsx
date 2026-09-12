import { useEffect, useState } from "react";

import {
  adminListPortfolio,
  adminCreatePortfolio,
  adminUpdatePortfolio,
  adminDeletePortfolio,
} from "../../api/client.js";
import ImageUploadField from "../../admin/ImageUploadField.jsx";

const EMPTY = {
  slug: "",
  title: "",
  client_name: "",
  summary: "",
  problem: "",
  solution: "",
  result: "",
  cover_image_url: "",
  gallery: [],
  tags: [],
  published: false,
  sort_order: 0,
};

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function PortfolioAdmin() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    adminListPortfolio().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    try {
      if (editing.id) {
        await adminUpdatePortfolio(editing.id, editing);
      } else {
        await adminCreatePortfolio(editing);
      }
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this project?")) return;
    await adminDeletePortfolio(id);
    refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold">{editing.id ? "Edit project" : "New project"}</h1>

        <Field label="Title">
          <input
            required
            value={editing.title}
            onChange={(e) =>
              setEditing({
                ...editing,
                title: e.target.value,
                slug: editing.id ? editing.slug : slugify(e.target.value),
              })
            }
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-cvc-ink"
          />
        </Field>
        <Field label="Slug">
          <input
            required
            value={editing.slug}
            onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-cvc-ink"
          />
        </Field>
        <Field label="Client name">
          <input
            value={editing.client_name || ""}
            onChange={(e) => setEditing({ ...editing, client_name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-cvc-ink"
          />
        </Field>
        <Field label="Summary (shown in listings)">
          <textarea
            value={editing.summary || ""}
            onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-cvc-ink"
            rows={2}
          />
        </Field>
        <Field label="Problem">
          <textarea
            value={editing.problem || ""}
            onChange={(e) => setEditing({ ...editing, problem: e.target.value })}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-cvc-ink"
            rows={3}
          />
        </Field>
        <Field label="Solution">
          <textarea
            value={editing.solution || ""}
            onChange={(e) => setEditing({ ...editing, solution: e.target.value })}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-cvc-ink"
            rows={3}
          />
        </Field>
        <Field label="Result">
          <textarea
            value={editing.result || ""}
            onChange={(e) => setEditing({ ...editing, result: e.target.value })}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-cvc-ink"
            rows={3}
          />
        </Field>

        <ImageUploadField
          label="Cover image"
          value={editing.cover_image_url}
          onChange={(url) => setEditing({ ...editing, cover_image_url: url })}
        />

        <ImageUploadField
          label="Add gallery image"
          value=""
          onChange={(url) => setEditing({ ...editing, gallery: [...(editing.gallery || []), url] })}
        />
        {editing.gallery?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {editing.gallery.map((src, i) => (
              <div key={src} className="relative">
                <img src={src} alt="" className="h-16 w-16 rounded object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setEditing({ ...editing, gallery: editing.gallery.filter((_, idx) => idx !== i) })
                  }
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cvc-crimson text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

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
          <button type="submit" className="rounded-lg bg-cvc-ink px-4 py-2 font-semibold text-cvc-paper">
            Save
          </button>
          <button type="button" onClick={() => setEditing(null)} className="text-sm text-cvc-muted">
            Cancel
          </button>
        </div>

      </form>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="rounded-lg bg-cvc-ink px-4 py-2 text-sm font-semibold text-cvc-paper"
        >
          New project
        </button>
      </div>

      <div className="mt-6 divide-y divide-black/10">
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-cvc-muted">
                {p.slug} · {p.published ? "published" : "draft"}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setEditing(p)} className="text-cvc-ink underline">
                Edit
              </button>
              <button onClick={() => handleDelete(p.id)} className="text-cvc-crimson">
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No projects yet.</p>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-cvc-ink">{label}</label>
      {children}
    </div>
  );
}
