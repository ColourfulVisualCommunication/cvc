import { useEffect, useState } from "react";

import { adminListPosts, adminCreatePost, adminUpdatePost, adminDeletePost } from "../../api/client.js";
import ImageUploadField from "../../admin/ImageUploadField.jsx";

const EMPTY = { slug: "", title: "", excerpt: "", body: "", cover_image_url: "", published: false };
const inputClass = "mt-1 w-full border border-black/15 px-3 py-2 outline-none focus:border-cvc-ink";

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function PostsAdmin() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    adminListPosts().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    try {
      if (editing.id) {
        await adminUpdatePost(editing.id, editing);
      } else {
        await adminCreatePost(editing);
      }
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this post?")) return;
    await adminDeletePost(id);
    refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold">{editing.id ? "Edit post" : "New post"}</h1>

        <div>
          <label className="text-sm font-medium text-cvc-ink">Title</label>
          <input
            required
            value={editing.title}
            onChange={(e) =>
              setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })
            }
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-cvc-ink">Slug</label>
          <input required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-cvc-ink">Excerpt</label>
          <textarea value={editing.excerpt || ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} className={inputClass} rows={2} />
        </div>
        <div>
          <label className="text-sm font-medium text-cvc-ink">Body (HTML)</label>
          <textarea value={editing.body || ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className={inputClass} rows={10} />
        </div>

        <ImageUploadField label="Cover image" value={editing.cover_image_url} onChange={(url) => setEditing({ ...editing, cover_image_url: url })} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} />
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
        <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
        <button onClick={() => setEditing({ ...EMPTY })} className="bg-cvc-ink px-4 py-2 text-sm font-semibold text-cvc-paper">
          New post
        </button>
      </div>

      <div className="mt-6 divide-y divide-black/10">
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-cvc-muted">{p.slug} · {p.published ? "published" : "draft"}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setEditing(p)} className="text-cvc-ink underline">Edit</button>
              <button onClick={() => handleDelete(p.id)} className="text-cvc-crimson">Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No posts yet.</p>}
      </div>
    </div>
  );
}
