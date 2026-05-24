"use client";

import { useEffect, useState } from "react";

type JournalEntry = {
  id: string;
  note: string;
  createdAt: string;
};

const STORAGE_KEY = "arahdana.journal";

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [note, setNote] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setEntries(readEntries());
      setIsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, isHydrated]);

  function addEntry() {
    const trimmedNote = note.trim();
    if (!trimmedNote) return;

    setEntries((current) => [
      {
        id: crypto.randomUUID(),
        note: trimmedNote,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setNote("");
  }

  function deleteEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <div className="grid max-w-3xl gap-5">
      <section className="rounded-[1.7rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <textarea
          className="input min-h-32 resize-y"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Tulis alasan keputusan, hal yang perlu dicek, atau pelajaran dari market hari ini."
        />
        <button
          type="button"
          onClick={addEntry}
          className="mt-4 min-h-11 rounded-[1rem] bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm"
        >
          Simpan catatan
        </button>
      </section>

      <section className="grid gap-3">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <time className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {formatDate(entry.createdAt)}
              </time>
              <button
                type="button"
                onClick={() => deleteEntry(entry.id)}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600"
              >
                Hapus
              </button>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">
              {entry.note}
            </p>
          </article>
        ))}
        {entries.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-stone-500">
              Belum ada catatan jurnal.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function readEntries() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isJournalEntry);
  } catch {
    return [];
  }
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.note === "string" &&
    typeof record.createdAt === "string"
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
