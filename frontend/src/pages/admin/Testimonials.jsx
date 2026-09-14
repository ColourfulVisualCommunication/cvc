import { useEffect, useState } from "react";

import {
  adminListTestimonials,
  adminCreateTestimonial,
  adminUpdateTestimonial,
  adminDeleteTestimonial,
} from "../../api/client.js";
import ImageUploadField from "../../admin/ImageUploadField.jsx";

const EMPTY = { client_name: "", client_role: "", quote: "", avatar_url: "", published: false };
const inputClass = "mt-1 w-full border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper";

export default function TestimonialsAdmin() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    adminListTestimonials().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    try {
      if (editing.id) {
        await adminUpdateTestimonial(editing.id, editing);
      } else {
        await adminCreateTestimonial(editing);
      }
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this testimonial?")) return;
    await adminDeleteTestimonial(id);
    refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold text-cvc-paper">{editing.id ? "Edit testimonial" : "New testimonial"}</h1>

        <div>
          <label className="text-sm font-medium text-cvc-paper">Client name</label>
          <input required value={editing.client_name} onChange={(e) => setEditing({ ...editing, client_name: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-cvc-paper">Client role / company</label>
          <input value={editing.client_role || ""} onChange={(e) => setEditing({ ...editing, client_role: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-cvc-paper">Quote</label>
          <textarea required value={editing.quote} onChange={(e) => setEditing({ ...editing, quote: e.target.value })} className={inputClass} rows={4} />
        </div>

        <ImageUploadField label="Avatar (optional)" value={editing.avatar_url} onChange={(url) => setEditing({ ...editing, avatar_url: url })} />

        <label className="flex items-center gap-2 text-sm text-cvc-paper">
          <input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} />
          Published (visible on the public site)
        </label>

        {error && <p className="text-sm text-cvc-crimson">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" className="bg-cvc-paper px-4 py-2 font-semibold text-cvc-ink">Save</button>
          <button type="button" onClick={() => setEditing(null)} className="text-sm text-cvc-muted">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Testimonials</h1>
        <button onClick={() => setEditing({ ...EMPTY })} className="bg-cvc-paper px-4 py-2 text-sm font-semibold text-cvc-ink">
          New testimonial
        </button>
      </div>

      <div className="mt-6 divide-y divide-white/10">
        {items.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-cvc-paper">{t.client_name}</p>
              <p className="text-sm text-cvc-muted">{t.published ? "published" : "draft"}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setEditing(t)} className="text-cvc-paper underline">Edit</button>
              <button onClick={() => handleDelete(t.id)} className="text-cvc-crimson">Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No testimonials yet.</p>}
      </div>
    </div>
  );
}
