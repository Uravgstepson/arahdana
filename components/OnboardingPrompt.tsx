"use client";

import Link from "next/link";
import { useState } from "react";

const ONBOARDING_KEY = "arahdana.onboarding.prompted.v1";

export function OnboardingPrompt() {
  const [isVisible, setIsVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(ONBOARDING_KEY) !== "true",
  );

  function dismiss() {
    window.localStorage.setItem(ONBOARDING_KEY, "true");
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <section className="motion-shell mb-5 rounded-[1.35rem] border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-950">Baru pertama memakai ArahDana?</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Baca onboarding singkat dulu supaya sinyal BUY/WAIT/AVOID dan batasan beta jelas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/onboarding"
            onClick={dismiss}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Buka onboarding
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            Nanti
          </button>
        </div>
      </div>
    </section>
  );
}
