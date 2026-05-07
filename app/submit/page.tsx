"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toastSuccess, toastError, toastInfo } from "@/lib/toast";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function SubmitPage() {
  const [form, setForm] = useState({
    full_name: "", title: "", company: "", email: "", phone: "", website: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toastError("Photo must be under 2MB.");
      return;
    }
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toastError("Only JPG, PNG, or WebP photos are accepted.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      toastError("Name is required.");
      return;
    }

    setSubmitting(true);
    toastInfo("Submitting your card…");

    try {
      const res = await fetch("/api/submit-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          title: form.title.trim() || null,
          company: form.company.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          website: form.website.trim() || null,
        }),
      });

      const { card, error: submitError } = await res.json();

      if (!res.ok || !card) {
        toastError(`Submission failed: ${submitError ?? "Unknown error"}`);
        setSubmitting(false);
        return;
      }

      if (photoFile) {
        const ext = photoFile.name.split(".").pop() ?? "jpg";
        const fileName = `${card.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(fileName, photoFile, { contentType: photoFile.type, upsert: false });

        if (uploadError) {
          toastError("Card saved but photo upload failed. Admin can add it later.");
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from("profile-photos")
            .getPublicUrl(fileName);

          await fetch("/api/submit-card", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: card.id, profile_photo_url: publicUrl }),
          });
        }
      }

      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName: card.full_name,
          cardTitle: card.title,
          cardCompany: card.company,
          cardEmail: card.email,
        }),
      });

      setSubmitted(true);
    } catch (err) {
      toastError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Submission Received!</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Your business card has been submitted for review. It will appear in the directory once approved by an admin.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            ← Back to Directory
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-6">
            ← Back to Directory
          </a>
          <h1 className="text-3xl font-extrabold text-slate-900">Submit Your Card</h1>
          <p className="mt-2 text-slate-500 text-sm">
            Fill in your details below. Your card will be reviewed before appearing in the directory.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

          {/* Photo upload */}
          <div className="mb-6 flex flex-col items-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 hover:border-blue-400 cursor-pointer transition-colors flex items-center justify-center group"
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <svg className="w-8 h-8 text-slate-400 group-hover:text-blue-400 mx-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
              )}
              {photoPreview && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">Change</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handlePhoto}
            />
            <p className="text-xs text-slate-400 mt-2">
              {photoFile ? photoFile.name : "Optional photo · JPG/PNG · max 2MB"}
            </p>
            {photoFile && (
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                className="text-xs text-red-400 hover:text-red-600 mt-1 transition-colors"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: "Full Name", name: "full_name", required: true, placeholder: "Jane Smith", span: 2 },
              { label: "Job Title", name: "title", placeholder: "Product Manager" },
              { label: "Company", name: "company", placeholder: "Acme Corp" },
              { label: "Email", name: "email", placeholder: "jane@acme.com", type: "email" },
              { label: "Phone", name: "phone", placeholder: "+1 555 010 0000" },
              { label: "Website", name: "website", placeholder: "acme.com", span: 2 },
            ].map(({ label, name, required, placeholder, type, span }) => (
              <div key={name} className={span === 2 ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={type ?? "text"}
                  name={name}
                  value={(form as any)[name]}
                  onChange={handleField}
                  placeholder={placeholder}
                  className="w-full text-sm text-slate-900 border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                />
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Submitting…
                </>
              ) : "Submit for Review"}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              Your card will appear after admin approval.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}