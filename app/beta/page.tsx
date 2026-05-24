"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { dispatchToast } from "@/components/ToastViewport";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  BetaInvestmentExperience,
  BetaSignup,
} from "@/lib/types/investment";

type BetaForm = {
  name: string;
  email: string;
  investmentExperience: BetaInvestmentExperience;
  feedbackInterest: string;
};

const experienceOptions: Array<{
  value: BetaInvestmentExperience;
  label: string;
  description: string;
}> = [
  {
    value: "beginner",
    label: "Beginner",
    description: "Baru mulai menyusun portofolio dan DCA.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Sudah rutin tracking dan evaluasi investasi.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Aktif memakai data, risk rules, dan review berkala.",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Bekerja di area finansial, riset, atau advisory.",
  },
];

export default function BetaPage() {
  const [form, setForm] = useState<BetaForm>({
    name: "",
    email: "",
    investmentExperience: "beginner",
    feedbackInterest: "",
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const localCount = useMemo(
    () => localArahDanaStorage.readBetaSignups()?.length ?? 0,
    [],
  );

  async function submitSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    const validation = validateForm(form);
    if (validation) {
      setError(validation);
      return;
    }

    const signup: BetaSignup = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      investmentExperience: form.investmentExperience,
      feedbackInterest: form.feedbackInterest.trim(),
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const savedToCloud = await trySaveSupabase(signup);
      const stored = localArahDanaStorage.readBetaSignups() ?? [];
      const signupWithStorage: BetaSignup = {
        ...signup,
        storageMode: savedToCloud ? "supabase" : "local",
      };
      localArahDanaStorage.writeBetaSignups([
        signupWithStorage,
        ...stored,
      ].slice(0, 100));
      setStatus(
        savedToCloud
          ? "Terima kasih. Signup beta tersimpan dan kamu masuk daftar tunggu."
          : "Terima kasih. Signup beta tersimpan lokal di browser ini.",
      );
      setForm({
        name: "",
        email: "",
        investmentExperience: "beginner",
        feedbackInterest: "",
      });
      dispatchToast({
        tone: "success",
        title: "Beta signup diterima",
        message: savedToCloud ? "Tersimpan di Supabase." : "Tersimpan lokal.",
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Signup belum bisa diproses. Coba lagi nanti.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="public-art-background text-stone-950">
      <section className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-5 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8">
        <div className="flex flex-col">
          <header className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3" aria-label="ArahDana">
              <BrandMark variant="icon" tone="light" className="h-11 w-11 shadow-sm ring-emerald-100" />
              <span className="text-lg font-semibold tracking-tight">ArahDana</span>
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Masuk App
            </Link>
          </header>

          <div className="flex flex-1 flex-col justify-center py-12">
            <p className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-100">
              Beta invite
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
              Bantu bentuk ArahDana sebelum rilis luas.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-600">
              Kami mencari pengguna beta yang ingin mencoba portfolio tracker, analyzer, goals, alerts, journal, dan reports dengan bahasa yang tenang.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <BetaPoint title="Private by default" text="Data lokal tetap bisa dipakai tanpa login." />
              <BetaPoint title="Akun opsional" text="Data tetap bisa dipakai aman di perangkat ini." />
              <BetaPoint title="Tanpa hype" text="Tidak ada bahasa janji profit." />
              <BetaPoint title="Feedback loop" text="Masukan beta dipakai untuk prioritas fitur." />
            </div>

            <p className="mt-6 text-xs font-medium text-stone-500">
              Mode perangkat aktif. {localCount} signup tersimpan di browser ini.
            </p>
          </div>
        </div>

        <div className="flex items-center pb-10 lg:pb-0">
          <form
            onSubmit={submitSignup}
            className="w-full rounded-[1.7rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                  Join beta
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Isi singkat saja. Kami akan memakai data ini untuk memahami kebutuhan pengguna awal.
                </p>
              </div>
              <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                {isSupabaseConfigured() ? "Data aman" : "Mode perangkat"}
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <Field label="Name">
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Nama kamu"
                />
              </Field>
              <Field label="Email">
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="nama@email.com"
                />
              </Field>
              <Field label="Investment experience">
                <div className="grid gap-2">
                  {experienceOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-[1rem] border p-3 ${
                        form.investmentExperience === option.value
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-stone-200 bg-white hover:bg-stone-50"
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="investmentExperience"
                        checked={form.investmentExperience === option.value}
                        onChange={() =>
                          setForm({ ...form, investmentExperience: option.value })
                        }
                      />
                      <span className="text-sm font-semibold text-stone-950">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-stone-500">{option.description}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Feedback interest">
                <textarea
                  className="input min-h-28"
                  value={form.feedbackInterest}
                  onChange={(event) => setForm({ ...form, feedbackInterest: event.target.value })}
                  placeholder="Fitur apa yang paling ingin kamu coba?"
                />
              </Field>
            </div>

            <button
              disabled={isSubmitting}
              className="mt-6 min-h-12 w-full rounded-[1rem] bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Menyimpan..." : "Submit beta invite"}
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

            <p className="mt-5 text-xs leading-5 text-stone-500">
              ArahDana adalah alat pendukung keputusan, bukan nasihat keuangan. Signup beta tidak menjamin akses langsung atau hasil investasi tertentu.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      {label}
      {children}
    </label>
  );
}

function BetaPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <p className="text-sm font-semibold text-stone-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">{text}</p>
    </div>
  );
}

async function trySaveSupabase(signup: BetaSignup) {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from("beta_signups").insert({
    local_id: signup.id,
    name: signup.name,
    email: signup.email,
    investment_experience: signup.investmentExperience,
    feedback_interest: signup.feedbackInterest,
    created_at: signup.createdAt,
  });

  if (error) {
    console.warn("Beta signup Supabase insert failed; falling back to localStorage.", error);
    return false;
  }

  return true;
}

function validateForm(form: BetaForm) {
  if (!form.name.trim()) return "Nama wajib diisi.";
  if (!isValidEmail(form.email)) return "Email belum valid.";
  if (!form.feedbackInterest.trim()) return "Tulis minat feedback atau fitur yang ingin dicoba.";
  return "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
