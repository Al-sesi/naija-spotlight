/// <reference types="vite/client" />

interface Window {
  __NAIJALIFT_ADSENSE_PUB_ID__?: string;
  __NAIJALIFT_ADSENSE_MODE__?: string;
  adsbygoogle?: unknown[] & { __adsense_load_failed?: boolean };
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;

  readonly VITE_APP_URL?: string;
  readonly VITE_USE_LOCAL_EMULATORS?: string;

  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID?: string;

  readonly VITE_RECAPTCHA_SITE_KEY?: string;

  readonly VITE_AMPLITUDE_API_KEY?: string;

  readonly VITE_SENTRY_DSN?: string;

  readonly VITE_ADSENSE_MODE?: "auto" | "manual" | string;
  readonly VITE_ADSENSE_PUB_ID?: string;
  readonly VITE_ADSLOT_FEED_NATIVE?: string;
  readonly VITE_ADSLOT_BANNER_728x90?: string;
  readonly VITE_ADSLOT_BANNER_320x50?: string;
  readonly VITE_ADSLOT_MEDIUM_RECT?: string;
  readonly VITE_ADSLOT_STICKY_BOTTOM?: string;

  readonly VITE_GOOGLE_ADS_ID?: string;
  readonly VITE_GOOGLE_ADS_CONVERSION_LABEL?: string;
  readonly VITE_GOOGLE_TAG_ID?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
