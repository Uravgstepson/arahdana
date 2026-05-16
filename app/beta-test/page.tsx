"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dispatchToast } from "@/components/ToastViewport";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { requireSupabase } from "@/lib/supabase/auth";
import type {
  BetaTestChecklistKey,
  BetaTestFeedback,
} from "@/lib/types/investment";

type FeedbackForm = {
  rating: number;
  confusing: string;
  useful: string;
  bugs: string;
  featureRequest: string;
};

const checklistItems: Array<{
  key: BetaTestChecklistKey;
  title: string;
  helper: string;
  href?: string;
}> = [
  { key: "create_account", title: "Create account", helper: "Sign up or log in with Supabase.", href: "/login" },
  { key: "add_portfolio", title: "Add portfolio", helper: "Add at least one holding.", href: "/portfolio" },
  { key: "refresh_prices", title: "Refresh prices", helper: "Try public market price refresh.", href: "/portfolio" },
  { key: "analyze_ticker", title: "Analyze ticker", helper: "Run analyzer on one ticker.", href: "/analyzer" },
  { key: "create_goal", title: "Create goal", helper: "Create a DCA or financial goal.", href: "/goals" },
  { key: "create_alert", title: "Create alert", helper: "Create one alert rule.", href: "/alerts" },
  { key: "write_journal", title: "Write journal", helper: "Note what felt unclear or useful." },
  { key: "generate_report", title: "Generate report", helper: "Create a portfolio review report.", href: "/reports" },
  { key: "export_backup", title: "Export backup", helper: "Export local data from Settings.", href: "/settings" },
  { key: "test_mobile", title: "Test on mobile", helper: "Check layout, tap targets, and readability." },
];

const checklistStorageKey = "arahdana.betaTest.checklist";

export default function BetaTestPage() {
  const { isConfigured, user } = useAuth();
  const [checklist, setChecklist] = useState<Partial<Record<BetaTestChecklistKey, boolean>>>(() => readChecklist());
  const [form, setForm] = useState<FeedbackForm>({
    rating: 4,
    confusing: "",
    useful: "",
    bugs: "",
    featureRequest: "",
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(checklistStorageKey, JSON.stringify(checklist));
  }, [checklist]);

  const completedCount = useMemo(
    () => checklistItems.filter((item) => checklist[item.key]).length,
    [checklist],
  );
  const progress = Math.round((completedCount / checklistItems.length) * 100);

  function toggleChecklist(key: BetaTestChecklistKey) {
    setChecklist((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    const validation = validateFeedback(form);
    if (validation) {
      setError(validation);
      return;
    }

    const feedback: BetaTestFeedback = {
      id: crypto.randomUUID(),
      rating: form.rating,
      confusing: form.confusing.trim(),
      useful: form.useful.trim(),
      bugs: form.bugs.trim(),
      featureRequest: form.featureRequest.trim(),
      checklist,
      email: user?.email ?? null,
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const savedToCloud = user && isConfigured ? await saveFeedbackToSupabase(feedback, user.id) : false;
      const stored = localArahDanaStorage.readBetaTestFeedback() ?? [];
      const nextFeedback: BetaTestFeedback = {
        ...feedback,
        storageMode: savedToCloud ? "supabase" : "local",
      };
      localArahDanaStorage.writeBetaTestFeedback([nextFeedback, ...stored].slice(0, 100));
      setStatus(
        savedToCloud
          ? "Feedback beta tersimpan ke Supabase. Terima kasih sudah menguji."
          : "Feedback beta tersimpan lokal di browser ini.",
      );
      setForm({
        rating: 4,
        confusing: "",
        useful: "",
        bugs: "",
        featureRequest: "",
      });
      dispatchToast({
        tone: "success",
        title: "Feedback beta tersimpan",
        message: savedToCloud ? "Tersimpan di Supabase." : "Tersimpan lokal.",
      });
    } catch (submitError) {
      const stored = localArahDanaStorage.readBetaTestFeedback() ?? [];
      const localFeedback: BetaTestFeedback = { ...feedback, storageMode: "local" };
      localArahDanaStorage.writeBetaTestFeedback([
        localFeedback,
        ...stored,
      ].slice(0, 100));
      setError(
        submitError instanceof Error
          ? `Supabase gagal, salinan lokal dibuat. ${submitError.message}`
          : "Supabase gagal, salinan lokal dibuat.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="overflow-hidden rounded-[1.8rem] bg-stone-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="w-fit rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/20">
              ArahDana Beta
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              v1.0 beta testing
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
              Ikuti checklist singkat, lalu kirim feedback terstruktur. Fokusnya: alur yang membingungkan, bug nyata, dan fitur yang paling membantu.
            </p>
          </div>
          <div className="rounded-[1.2rem] bg-white/8 p-4 ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/48">Progress</p>
            <p className="mt-1 text-2xl font-semibold">{progress}%</p>
            <p className="mt-1 text-xs text-white/50">{completedCount}/{checklistItems.length} selesai</p>
          </div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-stone-950">Testing checklist</h3>
            <p className="mt-1 text-sm text-stone-500">Checklist tersimpan lokal otomatis.</p>
          </div>
          <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
            {APP_VERSION_LABEL}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {checklistItems.map((item) => (
            <label
              key={item.key}
              className={`rounded-[1.2rem] border p-4 ${
                checklist[item.key]
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-stone-200 bg-white hover:bg-stone-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(checklist[item.key])}
                  onChange={() => toggleChecklist(item.key)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 accent-emerald-700"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-950">{item.title}</p>
                  <p className="mt-1 text-sm leading-5 text-stone-500">{item.helper}</p>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="mt-3 inline-flex rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-white"
                    >
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <form onSubmit={submitFeedback} className="rounded-[1.6rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h3 className="text-lg font-semibold text-stone-950">Beta feedback</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            {user && isConfigured
              ? "Feedback akan dicoba simpan ke Supabase dan tetap dicadangkan lokal."
              : "Mode lokal: feedback disimpan di browser ini."}
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-800">Rating</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setForm({ ...form, rating })}
                  className={`min-h-11 rounded-[0.9rem] text-sm font-semibold ${
                    form.rating === rating
                      ? "bg-stone-950 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          <FeedbackField
            label="What feels confusing?"
            value={form.confusing}
            onChange={(value) => setForm({ ...form, confusing: value })}
          />
          <FeedbackField
            label="What feels useful?"
            value={form.useful}
            onChange={(value) => setForm({ ...form, useful: value })}
          />
          <FeedbackField
            label="Bugs found"
            value={form.bugs}
            onChange={(value) => setForm({ ...form, bugs: value })}
          />
          <FeedbackField
            label="Feature request"
            value={form.featureRequest}
            onChange={(value) => setForm({ ...form, featureRequest: value })}
          />
        </div>

        <button
          disabled={isSubmitting}
          className="mt-5 min-h-12 w-full rounded-[1rem] bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Submit beta feedback"}
        </button>

        {status ? (
          <p className="mt-4 rounded-[1rem] bg-emerald-50 p-3 text-sm font-medium leading-6 text-emerald-800">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-[1rem] bg-rose-50 p-3 text-sm font-medium leading-6 text-rose-800">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function FeedbackField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      {label}
      <textarea
        className="input min-h-24"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

async function saveFeedbackToSupabase(feedback: BetaTestFeedback, userId: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("beta_test_feedback").insert({
    user_id: userId,
    local_id: feedback.id,
    rating: feedback.rating,
    confusing: feedback.confusing,
    useful: feedback.useful,
    bugs: feedback.bugs,
    feature_request: feedback.featureRequest,
    checklist: feedback.checklist,
    email: feedback.email,
    app_version: APP_VERSION_LABEL,
    page_url: window.location.href,
    created_at: feedback.createdAt,
  });
  if (error) throw error;
  return true;
}

function validateFeedback(form: FeedbackForm) {
  const hasText = [form.confusing, form.useful, form.bugs, form.featureRequest].some(
    (value) => value.trim().length >= 3,
  );
  if (!hasText) return "Isi minimal satu field feedback.";
  if (form.rating < 1 || form.rating > 5) return "Rating harus 1 sampai 5.";
  return "";
}

function readChecklist() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(checklistStorageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
