// app/page.tsx
// Shows only approved cards to public
// Admin: add, edit (with photo), delete cards, generate AI bio
"use client";
export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { toastSuccess, toastError, toastInfo } from "@/lib/toast";
import DeleteModal from "@/app/components/DeleteModal";
import { useEffect, useState, useRef } from "react";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const EMPTY_FORM = {
  full_name: "", title: "", company: "", email: "", phone: "", website: "", category_id: "",
};

const TAILWIND_TO_HEX: Record<string, string> = {
  "bg-blue-500":    "#3b82f6",
  "bg-emerald-500": "#10b981",
  "bg-rose-500":    "#f43f5e",
  "bg-amber-500":   "#f59e0b",
  "bg-purple-500":  "#a855f7",
  "bg-orange-500":  "#f97316",
  "bg-sky-500":     "#0ea5e9",
  "bg-pink-500":    "#ec4899",
  "bg-teal-500":    "#14b8a6",
  "bg-violet-500":  "#8b5cf6",
};

type Card = {
  id: string;
  full_name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  profile_photo_url: string | null;
  category_id: string | null;
  categories: { id: string; name: string; color: string } | null;
};

export default function Page() {
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Add state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState<any>(EMPTY_FORM);
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const addFileRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bio state — keyed by card id so each card tracks its own bio
  const [bios, setBios] = useState<Record<string, string>>({});
  const [generatingBioId, setGeneratingBioId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const [cardsRes, catsRes] = await Promise.all([
        supabase
          .from("cards")
          .select("*, categories(id, name, color)")
          .eq("status", "approved")
          .order("full_name", { ascending: true }),
        supabase.from("categories").select("*").order("name"),
      ]);

      if (!cardsRes.error && cardsRes.data) setCards(cardsRes.data as Card[]);
      if (!catsRes.error && catsRes.data) setCategories(catsRes.data);
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const validatePhoto = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) { toastError("Photo must be under 2MB."); return false; }
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toastError("Only JPG, PNG, or WebP photos are accepted."); return false;
    }
    return true;
  };

  const uploadPhoto = async (cardId: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${cardId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) { toastError(`Photo upload failed: ${error.message}`); return null; }
    const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
    return publicUrl;
  };

  const deleteOldPhoto = async (url: string) => {
    const path = url.split("/profile-photos/")[1];
    if (path) {
      await supabase.storage.from("profile-photos").remove([decodeURIComponent(path)]);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toastInfo("Signed out.");
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validatePhoto(file)) return;
    setAddPhotoFile(file);
    setAddPhotoPreview(URL.createObjectURL(file));
  };

  const handleAdd = async () => {
    if (!addFormData.full_name.trim()) { toastError("Name is required."); return; }
    setAdding(true);

    const { data: card, error: insertError } = await supabase
      .from("cards")
      .insert([{
        full_name: addFormData.full_name.trim(),
        title: addFormData.title.trim() || null,
        company: addFormData.company.trim() || null,
        email: addFormData.email.trim() || null,
        phone: addFormData.phone.trim() || null,
        website: addFormData.website.trim() || null,
        category_id: addFormData.category_id || null,
        status: "approved",
        approved_at: new Date().toISOString(),
      }])
      .select("*, categories(id, name, color)")
      .single();

    if (insertError || !card) {
      toastError(`Failed to add: ${insertError?.message ?? "Unknown error"}`);
      setAdding(false);
      return;
    }

    let photoUrl: string | null = null;
    if (addPhotoFile) {
      photoUrl = await uploadPhoto(card.id, addPhotoFile);
      if (photoUrl) await supabase.from("cards").update({ profile_photo_url: photoUrl }).eq("id", card.id);
    }

    setCards(prev => [...prev, { ...card, profile_photo_url: photoUrl }].sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    ));
    setAddFormData(EMPTY_FORM);
    setAddPhotoFile(null);
    setAddPhotoPreview(null);
    setShowAddForm(false);
    toastSuccess(`${card.full_name}'s card added successfully.`);
    setAdding(false);
  };

  const handleEditClick = (card: Card) => {
    setEditingId(card.id);
    setEditFormData({ ...card });
    setEditPhotoFile(null);
    setEditPhotoPreview(card.profile_photo_url ?? null);
  };

  const handleEditPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validatePhoto(file)) return;
    setEditPhotoFile(file);
    setEditPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (card: Card) => {
    setSaving(true);
    let photoUrl = card.profile_photo_url;

    if (editPhotoFile) {
      const newUrl = await uploadPhoto(card.id, editPhotoFile);
      if (newUrl) {
        if (card.profile_photo_url) await deleteOldPhoto(card.profile_photo_url);
        photoUrl = newUrl;
      }
    }

    const { error } = await supabase.from("cards").update({
      full_name: editFormData.full_name,
      title: editFormData.title || null,
      company: editFormData.company || null,
      email: editFormData.email || null,
      phone: editFormData.phone || null,
      website: editFormData.website || null,
      category_id: editFormData.category_id || null,
      profile_photo_url: photoUrl,
    }).eq("id", card.id);

    if (error) {
      toastError(`Update failed: ${error.message}`);
    } else {
      const cat = categories.find(c => c.id === editFormData.category_id) ?? card.categories;
      setCards(prev => prev.map(c =>
        c.id === card.id ? { ...c, ...editFormData, profile_photo_url: photoUrl, categories: cat } : c
      ));
      setEditingId(null);
      setEditPhotoFile(null);
      toastSuccess("Card updated successfully.");
    }
    setSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.profile_photo_url) await deleteOldPhoto(deleteTarget.profile_photo_url);
      const { error } = await supabase.from("cards").delete().eq("id", deleteTarget.id);
      if (error) {
        toastError(`Delete failed: ${error.message}`);
      } else {
        setCards(prev => prev.filter(c => c.id !== deleteTarget.id));
        toastSuccess(`${deleteTarget.full_name}'s card permanently deleted.`);
        setDeleteTarget(null);
      }
    } catch (err) {
      toastError("Unexpected error during delete.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Generate Bio ─────────────────────────────────────────
  const handleGenerateBio = async (card: Card) => {
    setGeneratingBioId(card.id);
    setBios(prev => ({ ...prev, [card.id]: "" }));

    try {
      const res = await fetch("/api/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: card.full_name,
          title: card.title,
          business: card.company,
          category: card.categories?.name,
        }),
      });

      if (!res.ok) {
        toastError("Failed to generate bio. Check your API key.");
        setGeneratingBioId(null);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setBios(prev => ({ ...prev, [card.id]: (prev[card.id] ?? "") + chunk }));
      }
    } catch (err) {
      toastError("Something went wrong generating the bio.");
      console.error(err);
    } finally {
      setGeneratingBioId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm font-medium animate-pulse">Loading Directory…</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Nav */}
        <nav className="flex justify-between items-center mb-8">
          <a href="/submit" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
            <span className="text-base">+</span> Submit Your Card
          </a>
          <div className="flex items-center gap-3">
            {user && (
              <a href="/admin/submissions"
                className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 bg-white px-3 py-1.5 rounded-lg">
                Submissions
              </a>
            )}
            {user ? (
              <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-full shadow-sm border border-slate-200">
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">{user.email}</span>
                <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider">Sign Out</button>
              </div>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 bg-white text-slate-700 px-5 py-2 rounded-full font-semibold shadow-sm border border-slate-300 hover:bg-slate-50 transition-all text-sm">
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
                Sign in
              </button>
            )}
          </div>
        </nav>

        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">Professional Directory</h1>
          <p className="mt-4 text-xl text-slate-600">
            Connecting experts across {cards.length} unique {cards.length === 1 ? "business" : "businesses"}.
          </p>
          {user && (
            <button
              onClick={() => { setShowAddForm(!showAddForm); setAddFormData(EMPTY_FORM); setAddPhotoFile(null); setAddPhotoPreview(null); }}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-full font-semibold shadow-sm hover:bg-blue-700 transition-all text-sm"
            >
              <span className="text-lg leading-none">{showAddForm ? "✕" : "+"}</span>
              {showAddForm ? "Cancel" : "Add Business Card"}
            </button>
          )}
        </header>

        {/* Add form */}
        {user && showAddForm && (
          <div className="mb-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-6">New Business Card</h2>
            <div className="flex flex-col items-center mb-6">
              <div
                onClick={() => addFileRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 hover:border-blue-400 cursor-pointer transition-colors flex items-center justify-center group"
              >
                {addPhotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={addPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-7 h-7 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                )}
                {addPhotoPreview && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">Change</span>
                  </div>
                )}
              </div>
              <input ref={addFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleAddPhoto} />
              <p className="text-xs text-slate-400 mt-2">{addPhotoFile ? addPhotoFile.name : "Optional photo"}</p>
              {addPhotoFile && <button onClick={() => { setAddPhotoFile(null); setAddPhotoPreview(null); }} className="text-xs text-red-400 hover:text-red-600 mt-1">Remove</button>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: "Full Name", key: "full_name", required: true, placeholder: "Jane Smith" },
                { label: "Title", key: "title", placeholder: "Job Title" },
                { label: "Company", key: "company", placeholder: "Company Name" },
                { label: "Email", key: "email", placeholder: "email@example.com", type: "email" },
                { label: "Phone", key: "phone", placeholder: "555-0100" },
              ].map(({ label, key, required, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input type={type ?? "text"} className="w-full text-sm text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={addFormData[key]} onChange={e => setAddFormData({ ...addFormData, [key]: e.target.value })} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                <select className="w-full text-sm text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={addFormData.category_id} onChange={e => setAddFormData({ ...addFormData, category_id: e.target.value })}>
                  <option value="">— Select a category —</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Website</label>
                <input className="w-full text-sm text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={addFormData.website} onChange={e => setAddFormData({ ...addFormData, website: e.target.value })} placeholder="example.com" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowAddForm(false)} className="px-6 py-2.5 rounded-full text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={handleAdd} disabled={adding} className="px-8 py-2.5 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50">
                {adding ? "Saving…" : "Save Card"}
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-y-10 gap-x-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map(card => {
            const isEditing = editingId === card.id;
            const isGenerating = generatingBioId === card.id;
            const bio = bios[card.id];
            const avatarUrl = card.profile_photo_url
              ?? `https://api.dicebear.com/7.x/personas/svg?seed=${card.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
            const categoryColor = TAILWIND_TO_HEX[card.categories?.color ?? ""] ?? "#94a3b8";

            return (
              <div key={card.id} className="group relative flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="h-2 w-full" style={{ backgroundColor: categoryColor }} />
                <div className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 ring-2 ring-white shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={isEditing ? (editPhotoPreview ?? avatarUrl) : avatarUrl} alt={card.full_name} className="h-full w-full object-cover" />
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
                      style={{ backgroundColor: categoryColor }}>
                      {card.categories?.name ?? "Uncategorized"}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <input ref={editFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleEditPhoto} />
                        <button onClick={() => editFileRef.current?.click()} className="text-xs text-blue-600 underline hover:text-blue-800">
                          {editPhotoFile ? "Photo selected ✓" : "Change photo"}
                        </button>
                        {editPhotoFile && (
                          <button onClick={() => { setEditPhotoFile(null); setEditPhotoPreview(card.profile_photo_url ?? null); }} className="text-xs text-slate-400 hover:text-red-500">Undo</button>
                        )}
                      </div>
                      {["full_name", "title", "company", "email", "phone", "website"].map(field => (
                        <input key={field} className="w-full text-sm text-slate-900 border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editFormData[field] ?? ""} onChange={e => setEditFormData({ ...editFormData, [field]: e.target.value })}
                          placeholder={field.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} />
                      ))}
                      <select className="w-full text-sm text-slate-900 border rounded px-2 py-1 outline-none bg-white"
                        value={editFormData.category_id ?? ""} onChange={e => setEditFormData({ ...editFormData, category_id: e.target.value })}>
                        <option value="">— Category —</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleSave(card)} disabled={saving}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50">
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button onClick={() => { setEditingId(null); setEditPhotoFile(null); }}
                          className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold uppercase hover:bg-slate-200">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">{card.full_name}</h3>
                      <p className="text-sm font-medium text-slate-500 italic">{card.title}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700 uppercase tracking-tight">{card.company}</p>

                      {/* AI Bio */}
                      {(bio || isGenerating) && (
                        <p className="mt-3 text-xs text-slate-500 leading-relaxed italic">
                          {bio}
                          {isGenerating && (
                            <span className="inline-block w-1.5 h-3 bg-slate-400 ml-0.5 animate-pulse rounded-sm" />
                          )}
                        </p>
                      )}

                      {user && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <button onClick={() => handleEditClick(card)}
                            className="text-[10px] bg-slate-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold uppercase hover:bg-blue-500 hover:text-white transition-colors">
                            Edit
                          </button>
                          <button onClick={() => setDeleteTarget(card)}
                            className="text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded border border-red-100 font-bold uppercase hover:bg-red-500 hover:text-white transition-colors">
                            Delete
                          </button>
                          <button
                            onClick={() => handleGenerateBio(card)}
                            disabled={isGenerating}
                            className="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded border border-purple-100 font-bold uppercase hover:bg-purple-500 hover:text-white transition-colors disabled:opacity-50"
                          >
                            {isGenerating ? "Writing…" : "✦ Bio"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="mt-auto space-y-2 pt-4 border-t border-slate-50">
                      {card.email && <p className="flex items-center text-xs text-slate-600 truncate"><span className="mr-2 text-slate-400">✉</span>{card.email}</p>}
                      {card.phone && <p className="flex items-center text-xs text-slate-600"><span className="mr-2 text-slate-400">📞</span>{card.phone}</p>}
                      {card.website && (
                        <a href={card.website.startsWith("http") ? card.website : `https://${card.website}`}
                          target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-500 font-medium">
                          <span className="mr-2 opacity-70">🌐</span>{card.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {cards.length === 0 && !loading && (
          <div className="text-center py-24 text-slate-400 text-sm">No approved cards yet.</div>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          cardName={deleteTarget.full_name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </main>
  );
}