import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, X, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsPremium } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

export type AdSlot =
  | "banner-728x90"
  | "banner-320x50"
  | "medium-rectangle-300x250"
  | "in-feed-native"
  | "sticky-bottom";

export type AdsenseMode = "auto" | "manual";

const AD_SLOT_ENV_MAP: Record<AdSlot, string | undefined> = {
  "banner-728x90": import.meta.env.VITE_ADSLOT_BANNER_728x90,
  "banner-320x50": import.meta.env.VITE_ADSLOT_BANNER_320x50,
  "medium-rectangle-300x250": import.meta.env.VITE_ADSLOT_MEDIUM_RECT,
  "in-feed-native": import.meta.env.VITE_ADSLOT_FEED_NATIVE,
  "sticky-bottom": import.meta.env.VITE_ADSLOT_STICKY_BOTTOM,
};

const DEFAULT_PUB_ID = import.meta.env.VITE_ADSENSE_PUB_ID || "2262462453475038";

function getEffectivePubId(): string {
  const fromEnv = import.meta.env.VITE_ADSENSE_PUB_ID;
  if (fromEnv && fromEnv.trim() && !fromEnv.includes("your-pub-id")) {
    return fromEnv.trim();
  }
  try {
    const winPub = (window as unknown as Record<string, string>).__NAIJALIFT_ADSENSE_PUB_ID__;
    if (typeof winPub === "string" && winPub.trim() && /^\d+$/.test(winPub.trim())) {
      return winPub.trim();
    }
  } catch {
    /* noop */
  }
  return DEFAULT_PUB_ID.trim();
}

function getEffectiveMode(): AdsenseMode {
  const rawEnv = import.meta.env.VITE_ADSENSE_MODE;
  if (rawEnv) {
    const m = rawEnv.trim().toLowerCase();
    if (m === "auto" || m === "manual") return m;
  }
  try {
    const winMode = (window as unknown as Record<string, string>).__NAIJALIFT_ADSENSE_MODE__;
    if (typeof winMode === "string") {
      const m = winMode.trim().toLowerCase();
      if (m === "auto" || m === "manual") return m;
    }
  } catch {
    /* noop */
  }
  return "auto";
}

interface AdBannerProps {
  slot: AdSlot;
  className?: string;
  adSenseSlotId?: string;
  handleUpgradeClick?: () => void;
  showSponsorLabel?: boolean;
}

const HOUSE_AD_VARIANTS = [
  {
    eyebrow: "Premium Lifter",
    title: "Go Ad-Free + Unlimited Apps",
    description: "Browse without distractions. Apply to every opportunity. Only ₦530/month.",
    cta: "Remove Ads",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    icon: Crown,
  },
  {
    eyebrow: "Limited Offer",
    title: "Unlock AI Matching Today",
    description: "Get personalized opportunities ranked for your profile. Upgrade now.",
    cta: "Try Premium",
    gradient: "from-indigo-500 via-violet-500 to-purple-500",
    icon: Sparkles,
  },
  {
    eyebrow: "Fast Track",
    title: "Skip The Wait — Early Access",
    description: "Premium members see new listings before free users. Be first to apply.",
    cta: "Get Early Access",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    icon: Zap,
  },
];

const ADS_GLOBALS_KEY = "__naijalift_ads__";

type AdsGlobalState = {
  scriptAttached: boolean;
  scriptReady: boolean;
  waiting: Array<() => void>;
  pageLevelPushed?: boolean;
};

function getAdsGlobals(): AdsGlobalState {
  const w = window as unknown as Record<string, unknown>;
  let state = w[ADS_GLOBALS_KEY] as AdsGlobalState | undefined;
  if (!state) {
    state = { scriptAttached: false, scriptReady: false, waiting: [], pageLevelPushed: false };
    w[ADS_GLOBALS_KEY] = state;
  }
  return state;
}

function syncAdsGlobalsFromDom(): void {
  const g = getAdsGlobals();
  const anyWin = window as unknown as { adsbygoogle?: unknown[] & { __adsense_load_failed?: boolean } };
  const existingScript = document.querySelector(
    'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
  ) as HTMLScriptElement | null;
  if (existingScript) {
    g.scriptAttached = true;
    if (anyWin.adsbygoogle && !anyWin.adsbygoogle.__adsense_load_failed) {
      try {
        const props = Object.getOwnPropertyDescriptor(anyWin.adsbygoogle, "loaded") ?? {};
        if ((anyWin.adsbygoogle as unknown as { loaded?: boolean }).loaded || existingScript.dataset.readyState) {
          g.scriptReady = true;
        } else {
          const copy = g.waiting.slice();
          g.waiting = [];
          existingScript.addEventListener(
            "load",
            () => {
              g.scriptReady = true;
              copy.forEach((cb) => { try { cb(); } catch { /* noop */ } });
            },
            { once: true }
          );
          existingScript.addEventListener(
            "error",
            () => {
              if (anyWin.adsbygoogle) anyWin.adsbygoogle.__adsense_load_failed = true;
              g.scriptReady = false;
              copy.forEach((cb) => { try { cb(); } catch { /* noop */ } });
            },
            { once: true }
          );
          void props;
        }
      } catch {
        g.scriptReady = true;
      }
    }
  }
}

function ensureAdSenseScript(pubId: string, opts?: { mode?: AdsenseMode }): Promise<void> {
  const mode = opts?.mode ?? getEffectiveMode();
  const g = getAdsGlobals();
  const anyWin = window as unknown as { adsbygoogle?: unknown[] & { __adsense_load_failed?: boolean } };
  anyWin.adsbygoogle = anyWin.adsbygoogle || [];

  if (mode === "auto") {
    syncAdsGlobalsFromDom();
    if (g.scriptReady) return Promise.resolve();
    return new Promise((resolve) => {
      g.waiting.push(resolve);
      const maxWait = window.setTimeout(() => resolve(), 3000);
      window.setTimeout(() => {
        if (window.clearTimeout) window.clearTimeout(maxWait);
      }, 3010);
      void maxWait;
    });
  }

  if (!g.scriptAttached) {
    syncAdsGlobalsFromDom();
  }

  if (!g.scriptAttached && !anyWin.adsbygoogle.__adsense_load_failed) {
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${pubId}`;
    s.onerror = () => {
      if (anyWin.adsbygoogle) anyWin.adsbygoogle.__adsense_load_failed = true;
      g.scriptReady = false;
      const copy = g.waiting.slice();
      g.waiting = [];
      copy.forEach((cb) => { try { cb(); } catch { /* noop */ } });
    };
    s.onload = () => {
      g.scriptReady = true;
      const copy = g.waiting.slice();
      g.waiting = [];
      copy.forEach((cb) => { try { cb(); } catch { /* noop */ } });
    };
    document.head.appendChild(s);
    g.scriptAttached = true;
  }

  if (g.scriptReady && anyWin.adsbygoogle) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    g.waiting.push(resolve);
    const maxWait = window.setTimeout(() => resolve(), 4000);
    window.setTimeout(() => {
      if (window.clearTimeout) window.clearTimeout(maxWait);
    }, 4010);
    void maxWait;
  });
}

export function AdBanner({
  slot,
  className,
  adSenseSlotId,
  onUpgradeClick,
  showSponsorLabel = true,
}: AdBannerProps) {
  const navigate = useNavigate();
  const { isPremium, isLoading } = useIsPremium();
  const adRef = useRef<HTMLModElement | null>(null);
  const [houseVariant] = useState(() => {
    const i = Math.floor(Math.random() * HOUSE_AD_VARIANTS.length);
    return HOUSE_AD_VARIANTS[i];
  });
  const [dismissed, setDismissed] = useState(false);
  const [adSenseLoaded, setAdSenseLoaded] = useState(false);

  const handleUpgradeClickClick = useCallback(() => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      navigate("/billing");
    }
  }, [onUpgradeClick, navigate]);

  const PUB_ID = getEffectivePubId();
  const MODE: AdsenseMode = getEffectiveMode();
  const resolvedSlotId = (adSenseSlotId ?? AD_SLOT_ENV_MAP[slot] ?? "").trim();
  const pubValid =
    !!PUB_ID && !PUB_ID.includes("your-pub-id") && /^\d+$/.test(PUB_ID);
  const slotValid = !!resolvedSlotId && /^\d+$/.test(resolvedSlotId);

  const manualAdReady = MODE === "manual" && slotValid;

  const useHouseAd = (() => {
    if (!pubValid) return true;
    if (MODE === "auto") return true;
    if (MODE === "manual" && !slotValid) return true;
    return false;
  })();

  useEffect(() => {
    if (isPremium || isLoading || dismissed) return;
    if (useHouseAd) return;
    if (MODE === "auto") return;
    if (!manualAdReady) return;
    if (!adRef.current) return;

    let cancelled = false;

    const doPush = () => {
      if (cancelled || !adRef.current) return;
      if (adRef.current.dataset.adStatus === "requested") return;
      const anyWin = window as unknown as { adsbygoogle?: unknown[] };
      if (!Array.isArray(anyWin.adsbygoogle)) return;
      try {
        anyWin.adsbygoogle.push({});
        adRef.current.dataset.adStatus = "requested";
        setAdSenseLoaded(true);
      } catch {
        setAdSenseLoaded(false);
      }
    };

    ensureAdSenseScript(PUB_ID, { mode: MODE }).then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => doPush());
      });
    });

    const t = window.setTimeout(() => {
      if (cancelled) return;
      if (adRef.current && adRef.current.dataset.adStatus !== "requested") {
        setAdSenseLoaded(false);
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isPremium, isLoading, dismissed, useHouseAd, PUB_ID, manualAdReady, MODE]);

  if (isLoading || isPremium) return null;
  if (dismissed) return null;

  const isInFeed = slot === "in-feed-native";
  const isMediumRect = slot === "medium-rectangle-300x250";
  const isStickyBottom = slot === "sticky-bottom";
  const isBanner728 = slot === "banner-728x90";
  const isBanner320 = slot === "banner-320x50";

  const SponsorLabel = () =>
    showSponsorLabel ? (
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
          Sponsored
        </span>
        {!isStickyBottom && (
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Dismiss ad"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    ) : null;

  if (useHouseAd) {
    if (isInFeed) {
      const Icon = houseVariant.icon;
      return (
        <div
          className={cn(
            "relative rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all animate-fade-up",
            className
          )}
          style={{ animationDelay: "0.01s" }}
        >
          <div className={cn("h-1.5 w-full bg-gradient-to-r", houseVariant.gradient)} />
          <div className="p-5 sm:p-6 space-y-4">
            <SponsorLabel />
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md shrink-0",
                  houseVariant.gradient
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className={cn("text-[11px] font-bold uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r", houseVariant.gradient)}>
                  {houseVariant.eyebrow}
                </p>
                <h3 className="font-display font-bold text-base sm:text-lg leading-tight text-foreground">
                  {houseVariant.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {houseVariant.description}
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpgradeClickClick}
              className={cn(
                "w-full h-10 font-semibold text-sm bg-gradient-to-r hover:opacity-95 transition-opacity text-white shadow",
                houseVariant.gradient
              )}
            >
              <Crown className="h-4 w-4 mr-2" />
              {houseVariant.cta}
            </Button>
          </div>
        </div>
      );
    }

    if (isMediumRect) {
      const Icon = houseVariant.icon;
      return (
        <div
          className={cn(
            "w-full max-w-[300px] mx-auto rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm",
            className
          )}
        >
          <div className={cn("h-1.5 w-full bg-gradient-to-r", houseVariant.gradient)} />
          <div className="p-4 space-y-3">
            <SponsorLabel />
            <div className="text-center space-y-2">
              <div
                className={cn(
                  "h-12 w-12 mx-auto rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md",
                  houseVariant.gradient
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className={cn("text-[10px] font-bold uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r", houseVariant.gradient)}>
                {houseVariant.eyebrow}
              </p>
              <h3 className="font-display font-bold text-sm leading-tight">
                {houseVariant.title}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {houseVariant.description}
              </p>
            </div>
            <Button
              onClick={handleUpgradeClickClick}
              size="sm"
              className={cn(
                "w-full font-semibold text-xs bg-gradient-to-r hover:opacity-95 transition-opacity text-white",
                houseVariant.gradient
              )}
            >
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              {houseVariant.cta}
            </Button>
          </div>
        </div>
      );
    }

    if (isStickyBottom) {
      const Icon = houseVariant.icon;
      return (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-slide-up",
            className
          )}
        >
          <div className={cn("h-1 w-full bg-gradient-to-r", houseVariant.gradient)} />
          <div className="container px-3 sm:px-6 py-2.5 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <div
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow shrink-0",
                  houseVariant.gradient
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r leading-none", houseVariant.gradient)}>
                  {houseVariant.eyebrow}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight truncate">
                  {houseVariant.title}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight truncate">
                  {houseVariant.description}
                </p>
              </div>
              <Button
                onClick={handleUpgradeClickClick}
                size="sm"
                className={cn(
                  "h-8 sm:h-9 px-3 sm:px-4 shrink-0 font-semibold text-[11px] sm:text-xs bg-gradient-to-r hover:opacity-95 text-white shadow",
                  houseVariant.gradient
                )}
              >
                <Crown className="h-3.5 w-3.5 sm:mr-1.5 hidden sm:block" />
                Upgrade
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/60 transition-colors"
                aria-label="Dismiss ad"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (isBanner728 || isBanner320) {
      const Icon = houseVariant.icon;
      return (
        <div
          className={cn(
            "w-full rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm",
            className
          )}
        >
          <div className={cn("h-1 w-full bg-gradient-to-r", houseVariant.gradient)} />
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <SponsorLabel />
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div
                className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow shrink-0",
                  houseVariant.gradient
                )}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className={cn("text-[10px] font-bold uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r inline-block", houseVariant.gradient)}>
                  {houseVariant.eyebrow}
                </p>
                <p className="text-sm sm:text-base font-display font-bold leading-tight">
                  {houseVariant.title}
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  {houseVariant.description}
                </p>
              </div>
              <Button
                onClick={handleUpgradeClickClick}
                size="sm"
                className={cn(
                  "shrink-0 font-semibold text-xs sm:text-sm bg-gradient-to-r hover:opacity-95 text-white shadow",
                  houseVariant.gradient
                )}
              >
                <Crown className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4" />
                {houseVariant.cta}
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  if (!manualAdReady) {
    return null;
  }

  const heightClass =
    isInFeed ? "min-h-[260px]" :
    isMediumRect ? "h-[250px] w-[300px]" :
    isStickyBottom ? "h-[72px] sm:h-[80px]" :
    isBanner728 ? "h-[90px] max-h-[90px]" :
    "h-[50px] max-h-[50px]";

  const adFormat =
    isInFeed ? "fluid" :
    isMediumRect ? "rectangle" :
    isBanner728 ? "horizontal" :
    isStickyBottom ? "horizontal" :
    "horizontal";

  void adSenseLoaded;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {showSponsorLabel && !isStickyBottom && <SponsorLabel />}
      <ins
        ref={adRef}
        className={cn("adsbygoogle block", heightClass)}
        style={{ display: "block" }}
        data-ad-client={`ca-pub-${PUB_ID}`}
        data-ad-slot={resolvedSlotId}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}
