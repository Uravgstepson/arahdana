"use client";

import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils/format";

const PRIVACY_STORAGE_KEY = "arahdana.privacyLock";
const PRIVACY_EVENT = "arahdana:privacy-lock-updated";
const PRIVACY_REVEAL_EVENT = "arahdana:privacy-reveal-updated";

export function PrivateValue({
  children,
  mask = "Rp ------",
}: {
  children: ReactNode;
  mask?: ReactNode;
}) {
  const isPrivate = usePortfolioPrivacyMode();
  const isRevealed = usePortfolioPrivacyReveal();
  const isMasked = isPrivate && !isRevealed;

  return (
    <span
      className="private-value"
      data-private-active={isMasked ? "true" : "false"}
    >
      <span className="private-value-real">{children}</span>
      <span className="private-value-mask" aria-hidden={isMasked ? "false" : "true"}>
        {mask}
      </span>
    </span>
  );
}

export function PortfolioPrivacyToggle({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const isPrivate = usePortfolioPrivacyMode();
  const revealTimerRef = useRef<number | null>(null);
  const isRevealingRef = useRef(false);
  const consumeClickRef = useRef(false);

  function togglePrivacy() {
    const nextValue = !readPrivacyMode();
    writePrivacyMode(nextValue);
  }

  function clearRevealTimer() {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }

  function startRevealPress() {
    if (!isPrivate) return;
    clearRevealTimer();
    revealTimerRef.current = window.setTimeout(() => {
      isRevealingRef.current = true;
      consumeClickRef.current = true;
      writePrivacyReveal(true);
    }, 280);
  }

  function stopRevealPress() {
    clearRevealTimer();
    if (isRevealingRef.current) {
      isRevealingRef.current = false;
      writePrivacyReveal(false);
    }
  }

  useEffect(() => {
    return () => {
      clearRevealTimer();
      writePrivacyReveal(false);
    };
  }, []);

  return (
    <button
      type="button"
      {...props}
      onPointerDown={(event) => {
        props.onPointerDown?.(event);
        startRevealPress();
      }}
      onPointerUp={(event) => {
        props.onPointerUp?.(event);
        stopRevealPress();
      }}
      onPointerCancel={(event) => {
        props.onPointerCancel?.(event);
        stopRevealPress();
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        stopRevealPress();
      }}
      onContextMenu={(event) => {
        if (isPrivate) event.preventDefault();
        props.onContextMenu?.(event);
      }}
      onClick={(event) => {
        if (consumeClickRef.current) {
          consumeClickRef.current = false;
          event.preventDefault();
          return;
        }
        props.onClick?.(event);
        if (!event.defaultPrevented) togglePrivacy();
      }}
      className={cn(
        "inline-grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 transition",
        isPrivate
          ? "bg-emerald-300 text-stone-950 ring-emerald-200 shadow-[0_10px_26px_rgba(16,185,129,0.22)]"
          : "bg-white/10 text-white/78 ring-white/15 hover:bg-white/16",
        className,
      )}
      title={isPrivate ? "Tahan untuk melihat nominal" : "Sembunyikan nominal"}
      aria-label={isPrivate ? "Privasi aktif, tahan untuk melihat nominal" : "Aktifkan privasi nominal"}
      aria-pressed={isPrivate}
    >
      <svg
        aria-hidden="true"
        className="h-[1.125rem] w-[1.125rem]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {isPrivate ? (
          <>
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <path d="M12 14v2" />
          </>
        ) : (
          <>
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 7.5-2" />
            <path d="M12 14v2" />
          </>
        )}
      </svg>
    </button>
  );
}

function usePortfolioPrivacyMode() {
  const [isPrivate, setIsPrivate] = useState(() => readPrivacyMode());

  useEffect(() => {
    function handleUpdate() {
      setIsPrivate(readPrivacyMode());
    }

    handleUpdate();
    window.addEventListener(PRIVACY_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PRIVACY_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return isPrivate;
}

function usePortfolioPrivacyReveal() {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    function handleUpdate(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      setIsRevealed(Boolean(detail?.revealed));
    }

    window.addEventListener(PRIVACY_REVEAL_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(PRIVACY_REVEAL_EVENT, handleUpdate);
    };
  }, []);

  return isRevealed;
}

function readPrivacyMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PRIVACY_STORAGE_KEY) === "true";
}

function writePrivacyMode(isPrivate: boolean) {
  window.localStorage.setItem(PRIVACY_STORAGE_KEY, isPrivate ? "true" : "false");
  window.dispatchEvent(new CustomEvent(PRIVACY_EVENT));
}

function writePrivacyReveal(isRevealed: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PRIVACY_REVEAL_EVENT, {
      detail: { revealed: isRevealed },
    }),
  );
}
