"use client";

import { useState } from "react";
import { FlowPanel, FocusedFlowShell } from "@/components/FocusedFlow";
import { ButtonLink } from "@/components/ui";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { PortfolioItem } from "@/lib/types/investment";
import { formatRupiah } from "@/lib/utils/format";
import { productTypeLabel } from "../holdingFlow";

export default function PortoManagePage() {
  const [items] = useState<PortfolioItem[]>(
    () => localArahDanaStorage.readPortfolio() ?? [],
  );

  return (
    <FocusedFlowShell
      eyebrow="Manage Porto"
      title="Kelola holding tanpa memenuhi dashboard"
      description="Aksi tambah dan edit dikumpulkan di area pengelolaan khusus. Halaman Porto tetap untuk memantau."
      backHref="/portfolio"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ActionCard
          title="Tambah holding"
          detail="Flow tambah manual untuk produk baru."
          href="/porto/add"
        />
        <ActionCard
          title="Review"
          detail="Buka jurnal, laporan, dan health score."
          href="/review"
        />
      </div>

      <FlowPanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">
              Holding tersimpan
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Pilih satu item untuk masuk ke flow edit.
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">
            {items.length}
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {items.length === 0 ? (
            <p className="rounded-[1rem] bg-stone-50 p-4 text-sm leading-6 text-stone-600 ring-1 ring-stone-200">
              Belum ada holding. Mulai dari flow tambah agar input tetap fokus.
            </p>
          ) : null}
          {items.map((item) => (
            <ButtonLink
              key={item.id}
              href={`/porto/edit?id=${encodeURIComponent(item.id)}`}
              variant="secondary"
              className="min-h-16 justify-between rounded-[1.1rem] text-left"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-950">
                  {item.name}
                </span>
                <span className="mt-1 block text-xs text-stone-500">
                  {productTypeLabel(item.type)}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs font-semibold text-stone-600">
                {formatRupiah(item.currentPrice * item.quantity)}
              </span>
            </ButtonLink>
          ))}
        </div>
      </FlowPanel>
    </FocusedFlowShell>
  );
}

function ActionCard({
  title,
  detail,
  href,
}: {
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <ButtonLink
      href={href}
      variant="secondary"
      className="min-h-28 flex-col items-start justify-center rounded-[1.3rem] bg-white p-4 text-left shadow-sm"
    >
      <span className="text-base font-semibold text-stone-950">{title}</span>
      <span className="mt-2 text-xs font-medium leading-5 text-stone-500">
        {detail}
      </span>
    </ButtonLink>
  );
}
