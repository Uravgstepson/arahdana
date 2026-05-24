import { cn } from "@/lib/utils/format";

type BrandMarkVariant = "icon" | "full";
type BrandMarkTone = "light" | "plain";

const brandSources: Record<BrandMarkVariant, string> = {
  icon: "/icons/arahdana-icon.svg",
  full: "/icons/Logo_full_brand-removebg-preview.png",
};

export function BrandMark({
  className,
  imageClassName,
  tone = "plain",
  variant = "icon",
}: {
  className?: string;
  imageClassName?: string;
  tone?: BrandMarkTone;
  variant?: BrandMarkVariant;
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden",
        variant === "icon" ? "h-10 w-10 rounded-[1rem] p-2" : "h-12 w-40 rounded-[1.1rem] px-3 py-2",
        tone === "light" ? "bg-white/72 ring-1 ring-white/70" : "bg-transparent",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brandSources[variant]}
        alt=""
        className={cn("brand-mark h-full w-full object-contain", imageClassName)}
        draggable={false}
      />
    </span>
  );
}
