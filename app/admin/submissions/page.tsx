// app/admin/submissions/page.tsx
// Admin-only dashboard to approve/reject pending cards + delete any card
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toastSuccess, toastError, toastInfo } from "@/lib/toast";
import DeleteModal from "@/components/DeleteModal";
import { useRouter } from "next/navigation";

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
  created_at: string;
  approved_at: string | null;
  categories: { name: string; color: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminSubmissionsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUser(user);
      await fetchCards();
      setLoading(false);
    };
    init();
  }, [router]);

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from("cards")
      .select("*, categories(name, color)")
      .order("created_at", { ascending: false });
    if (!error && data) setCards(data as Card[]);
  };

  const handleApprove = async (card: Card) => {
    setActioningId(card.id);
    const { error } = await supabase
      .from("cards")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", card.id);
    if (error) {
      toastError(`Failed to approve: ${error.message}`);
    } else {
      setCards(cards.map(c => c.id === card.id ? { ...c, status: "approved", approved_at: new Date().toISOString() } : c));
      toastSuccess(`${card.full_name}'s card approved and is now live.`);
    }
    setActioningId(null);
  };

  const handleReject = async (card: Card) => {
    setActioningId(card.id);
    const { error } = await supabase
      .from("cards")
      .update({ status: "rejected" })
      .eq("id", card.id);
    if (error) {
      toastError(`Failed to reject: ${error.message}`);
    } else {
      setCards(cards.map(c => c.id === card.id ? { ...c, status: "rejected" } : c));
      toastInfo(`${card.full_name}'s card rejected.`);
    }
    setActioningId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      // Delete photo from storage if exists
      if (deleteTarget.profile_photo_url) {
        const path = deleteTarget.profile_photo_url.split("/profile-photos/")[1];
        if (path) {
          const { error: storageError } = await supabase.storage
            .from("profile-photos")
            .remove([decodeURIComponent(path)]);
          if (storageError) console.warn("Storage delete warning:", storageError.message);
        }
      }

      // Delete from DB
      const { error: dbError } = await supabase
        .from("cards")
        .delete()
        .eq("id", deleteTarget.id);

      if (dbError) {
        toastError(`Delete failed: ${dbError.message}`);
      } else {
        setCards(cards.filter(c => c.id !== deleteTarget.id));
        toastSuccess(`${deleteTarget.full_name}'s card permanently deleted.`);
        setDeleteTarget(null);
      }
    } catch (err) {
      toastError("Unexpected error during delete.");
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = filter === "all" ? cards : cards.filter(c => c.status === filter);

  const counts = {
    all: cards.length,
    pending: cards.filter(c => c.status === "pending").length,
    approved: cards.filter(c => c.status === "approved").length,
    rejected: cards.filter(c => c.status === "rejected").length,
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm font-medium animate-pulse">Loading…</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <a href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← Back to Directory</a>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Submissions Dashboard</h1>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={fetchCards}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 transition-colors self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                filter === tab
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              }`}
            >
              {tab} ({counts[tab]})
            </button>
          ))}
        </div>

        {/* Cards list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 text-sm">
            No {filter === "all" ? "" : filter} submissions.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(card => {
              const avatarUrl = card.profile_photo_url
                ?? `https://api.dicebear.com/7.x/personas/svg?seed=${card.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
              const isActioning = actioningId === card.id;

              return (
                <div key={card.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-5 flex-wrap sm:flex-nowrap">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl} alt={card.full_name} className="w-full h-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{card.full_name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[card.status]}`}>
                        {card.status}
                      </span>
                      {card.categories && (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                          {card.categories.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[card.title, card.company].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[card.email, card.phone].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1">
                      Submitted {new Date(card.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    {card.status !== "approved" && (
                      <button
                        onClick={() => handleApprove(card)}
                        disabled={isActioning}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isActioning ? "…" : "Approve"}
                      </button>
                    )}
                    {card.status !== "rejected" && (
                      <button
                        onClick={() => handleReject(card)}
                        disabled={isActioning}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                      >
                        {isActioning ? "…" : "Reject"}
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(card)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
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