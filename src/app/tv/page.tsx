'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const STORAGE_KEY = 'bstv_tv_auth_token';
const SITE_BUY_URL_VOD = '/vod';
const SITE_BUY_URL_HOME = '/';

type CatalogVod = {
  product_id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: string | null;
  currency: string;
  event_slug: string;
  event_name: string;
  event_date: string;
  event_image: string | null;
  owned: boolean;
};

type CatalogLive = {
  event_id: string;
  name: string;
  date: string;
  is_streaming: boolean;
  is_active: boolean;
  poster_image: string | null;
  owned: boolean;
};

type Catalog = {
  live: CatalogLive | null;
  vods: CatalogVod[];
  viewer: { email: string } | null;
};

type LibraryVod = {
  purchase_id: string;
  title: string;
  thumbnail: string | null;
  expires_at: string | null;
  product_id: string | null;
};

type SelectedItem =
  | { kind: 'vod'; product: CatalogVod; ownedPurchaseId?: string }
  | { kind: 'live'; event: CatalogLive };

function TvHomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [libraryVods, setLibraryVods] = useState<LibraryVod[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On mount: paired users skip the intro and go straight to the catalog;
  // anonymous users see the intro and pick Get Started or Explore.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAuthToken(stored);
      setShowCatalog(true);
    }
  }, []);
  // searchParams reserved for future use; keep the import wired.
  void searchParams;

  const refreshCatalog = useCallback(
    async (token: string | null) => {
      try {
        const res = await fetch('/api/tv/catalog', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 401) {
          // Token expired — drop it and stay in anonymous catalog.
          localStorage.removeItem(STORAGE_KEY);
          setAuthToken(null);
          // Re-fetch unauthenticated.
          const r2 = await fetch('/api/tv/catalog');
          if (r2.ok) setCatalog(await r2.json());
          return;
        }
        if (!res.ok) {
          setError('Could not load catalog.');
          return;
        }
        setCatalog(await res.json());
      } catch {
        setError('Network error loading catalog.');
      }
    },
    [],
  );

  // Load catalog whenever we enter catalog view (auth state-aware).
  useEffect(() => {
    if (!showCatalog) return;
    refreshCatalog(authToken);
  }, [showCatalog, authToken, refreshCatalog]);

  // Load library (purchase IDs we need to deep-link to /tv/watch) when authed.
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tv/library', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setLibraryVods(data.vods ?? []);
        }
      } catch {
        // Catalog still works without library — owned VODs just won't have
        // a Watch CTA target.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  // Auto-poll catalog every 30s when paired — reflects fresh purchases
  // without a manual refresh.
  useEffect(() => {
    if (!authToken || !showCatalog) return;
    const id = setInterval(() => refreshCatalog(authToken), 30_000);
    return () => clearInterval(id);
  }, [authToken, showCatalog, refreshCatalog]);

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setLibraryVods([]);
    setShowCatalog(false);
    setSelected(null);
  }

  function handleSelectVod(product: CatalogVod) {
    if (product.owned) {
      const owned = libraryVods.find((v) => v.product_id === product.product_id);
      if (owned) {
        router.push(`/tv/watch?purchase_id=${owned.purchase_id}`);
        return;
      }
    }
    setSelected({ kind: 'vod', product });
  }

  function handleSelectLive(event: CatalogLive) {
    if (event.owned) {
      router.push(`/tv/watch?event_id=${event.event_id}`);
      return;
    }
    setSelected({ kind: 'live', event });
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (!showCatalog) {
    return (
      <IntroScreen
        isPaired={!!authToken}
        onPrimary={() => {
          if (authToken) {
            // Already signed in — go straight to the catalog.
            setShowCatalog(true);
          } else {
            router.push('/tv/pair');
          }
        }}
        onExplore={() => setShowCatalog(true)}
        onSignOut={signOut}
      />
    );
  }

  return (
    <>
      <CatalogScreen
        catalog={catalog}
        error={error}
        viewerEmail={authToken ? catalog?.viewer?.email ?? null : null}
        onSelectVod={handleSelectVod}
        onSelectLive={handleSelectLive}
        onPair={() => router.push('/tv/pair')}
        onSignOut={signOut}
      />
      {selected && (
        <BuyOrPairSidebar
          selected={selected}
          authed={!!authToken}
          onClose={() => setSelected(null)}
          onPair={() => router.push('/tv/pair')}
        />
      )}
    </>
  );
}

export default function TvHome() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white" />
        </div>
      }
    >
      <TvHomeInner />
    </Suspense>
  );
}

// ── Intro screen ─────────────────────────────────────────────────────────

function IntroScreen({
  isPaired,
  onPrimary,
  onExplore,
  onSignOut,
}: {
  isPaired: boolean;
  onPrimary: () => void;
  onExplore: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <Image
          src="/logos/BoxStreamThumbnail.png"
          alt="BoxStreamTV"
          width={120}
          height={120}
          priority
          className="mb-10"
        />
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 text-center">
          BoxStreamTV
        </h1>
        <p className="text-base md:text-lg text-gray-400 mb-16 text-center max-w-2xl">
          Live boxing PPV and on-demand replays. Stream the fights you bought on any TV.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={onPrimary}
            className="flex-1 bg-white text-black font-bold py-5 text-sm tracking-[0.2em] uppercase hover:bg-gray-200 focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus:outline-none transition-colors"
          >
            {isPaired ? 'Continue' : 'Get Started'}
          </button>
          <button
            onClick={onExplore}
            className="flex-1 border border-white/30 text-white font-bold py-5 text-sm tracking-[0.2em] uppercase hover:border-white focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:border-white focus:outline-none transition-colors"
          >
            Explore
          </button>
        </div>

        {isPaired ? (
          <button
            onClick={onSignOut}
            className="mt-12 text-xs tracking-[0.2em] uppercase text-gray-500 hover:text-white"
          >
            Sign out
          </button>
        ) : (
          <p className="mt-12 text-xs text-gray-600 tracking-wider text-center max-w-md">
            Already bought a fight or replay? <span className="text-gray-400">Get Started</span> to
            sign in. Just looking? <span className="text-gray-400">Explore</span> the catalog.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Catalog screen (anonymous and authed share this) ───────────────────

function CatalogScreen({
  catalog,
  error,
  viewerEmail,
  onSelectVod,
  onSelectLive,
  onPair,
  onSignOut,
}: {
  catalog: Catalog | null;
  error: string | null;
  viewerEmail: string | null;
  onSelectVod: (vod: CatalogVod) => void;
  onSelectLive: (live: CatalogLive) => void;
  onPair: () => void;
  onSignOut: () => void;
}) {
  if (error && !catalog) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-400">
        {error}
      </div>
    );
  }
  if (!catalog) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white" />
      </div>
    );
  }

  // Group VOD products by their Stripe event_slug metadata, so each event
  // gets its own row. Sort groups by event_date desc (newest first), and
  // within each group preserve the catalog API's existing sort_order.
  const eventGroups = (() => {
    const map = new Map<
      string,
      { slug: string; name: string; date: string; vods: CatalogVod[] }
    >();
    for (const v of catalog.vods) {
      const slug = v.event_slug || 'uncategorized';
      const existing = map.get(slug);
      if (existing) {
        existing.vods.push(v);
      } else {
        map.set(slug, {
          slug,
          name: v.event_name || 'Other Fights',
          date: v.event_date || '2020-01-01',
          vods: [v],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  })();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/BoxStreamThumbnail.png"
            alt="BoxStreamTV"
            width={36}
            height={36}
          />
          <span className="text-sm font-bold tracking-[0.3em] uppercase text-white">
            BoxStreamTV
          </span>
        </div>
        <div className="flex items-center gap-6">
          {viewerEmail ? (
            <>
              <span className="text-xs text-gray-500 tracking-wider">{viewerEmail}</span>
              <button
                onClick={onSignOut}
                className="text-xs tracking-[0.2em] uppercase text-gray-400 hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={onPair}
              className="text-xs tracking-[0.2em] uppercase border border-white/30 px-4 py-2 hover:border-white"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Live event hero */}
      {catalog.live && (
        <LiveHero live={catalog.live} onSelect={() => onSelectLive(catalog.live!)} />
      )}

      {/* One row per event — using stripe metadata.event_slug + event_name */}
      {eventGroups.map((group) => (
        <Row key={group.slug} title={group.name}>
          {group.vods.map((v) => (
            <Card
              key={v.product_id}
              title={v.name}
              subtitle={v.owned ? 'Watch now' : v.price ? `$${v.price}` : 'Buy on phone'}
              thumbnail={v.image}
              cta={v.owned ? 'watch' : 'buy'}
              onClick={() => onSelectVod(v)}
            />
          ))}
        </Row>
      ))}

      {!catalog.live && eventGroups.length === 0 && (
        <div className="px-8 py-24 text-center text-gray-500">
          <p className="text-lg">Nothing on sale right now.</p>
          <p className="mt-2 text-sm">Check back when the next fight drops.</p>
        </div>
      )}
    </div>
  );
}

function LiveHero({
  live,
  onSelect,
}: {
  live: CatalogLive;
  onSelect: () => void;
}) {
  const dateLabel = new Date(live.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <section className="relative bg-black text-white overflow-hidden border-b border-white/5">
      {/* Cinematic atmosphere — blurred poster bleeds color into the section.
          Same effect as the homepage EventHero. */}
      {live.poster_image ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={live.poster_image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-70"
          />
          {/* Horizontal fade so text on the left reads cleanly. */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
          {/* Light vertical darken at top + bottom. */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-black" />
      )}

      <div className="relative z-10 px-8 py-10 md:py-14 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left: text + CTA */}
          <div className="md:col-span-7 order-2 md:order-1 space-y-4">
            <p
              className={`text-[11px] font-bold tracking-[0.3em] uppercase ${
                live.is_streaming ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {live.is_streaming ? '● Live Now' : 'Upcoming PPV'}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[0.95] drop-shadow-lg">
              {live.name}
            </h2>
            <div className="w-10 h-[2px] bg-white" />
            <p className="text-sm md:text-base text-gray-300">{dateLabel}</p>
            <div className="pt-2">
              <button
                onClick={onSelect}
                className={`px-7 py-3.5 text-xs font-bold tracking-[0.2em] uppercase transition-colors ${
                  live.owned
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'border border-white/40 text-white hover:border-white bg-white/5 backdrop-blur-sm'
                }`}
              >
                {live.owned
                  ? live.is_streaming
                    ? 'Watch Now'
                    : 'Get Ready'
                  : 'Buy on Phone'}
              </button>
            </div>
          </div>

          {/* Right: sharp poster — given a larger share of the row so it
              dominates the hero composition. */}
          {live.poster_image && (
            <div className="md:col-span-5 md:col-start-8 order-1 md:order-2 flex justify-center md:justify-end">
              <div className="relative aspect-[3/4] w-80 md:w-[28rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={live.poster_image}
                  alt={live.name}
                  className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-8 pt-10">
      <h3 className="mb-4 text-sm font-bold tracking-[0.25em] uppercase text-white">
        {title}
      </h3>
      {/* Scroll-snap so D-pad navigation lands each card cleanly into view.
          scroll-pl-8 leaves a comfortable inset on the leading edge so the
          focused card doesn't sit flush against the screen border.
          Vertical padding gives the focus scale room. */}
      <div className="flex gap-4 overflow-x-auto pt-2 pb-4 -mx-2 px-2 snap-x snap-mandatory scroll-pl-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

// Static ASCII block used as a placeholder when a product has no poster.
// Computed once at module load so cards don't re-randomize on every render.
const ASCII_PLACEHOLDER_CHARS = '░▒▓█■□●◆◇※✦⌬╳╲╱┃═╬╪╫▓▒░';
const ASCII_PLACEHOLDER_COLS = 14;
const ASCII_PLACEHOLDER_ROWS = 22;
const ASCII_PLACEHOLDER = (() => {
  let out = '';
  for (let r = 0; r < ASCII_PLACEHOLDER_ROWS; r++) {
    for (let c = 0; c < ASCII_PLACEHOLDER_COLS; c++) {
      out +=
        ASCII_PLACEHOLDER_CHARS[
          Math.floor(Math.random() * ASCII_PLACEHOLDER_CHARS.length)
        ];
    }
    if (r < ASCII_PLACEHOLDER_ROWS - 1) out += '\n';
  }
  return out;
})();

function Card({
  title,
  subtitle,
  thumbnail,
  cta,
  onClick,
}: {
  title: string;
  subtitle?: string | null;
  thumbnail: string | null;
  cta: 'watch' | 'buy';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      // snap-start: each card lands at a clean left edge when scrolled to
      // via D-pad. focus-visible drives the visible-from-couch focus ring;
      // hover stays subtle for cursor users.
      className={`group relative shrink-0 w-48 aspect-[3/4] overflow-hidden border bg-white/[0.04] snap-start transition-all duration-150 hover:scale-[1.03] focus:outline-none focus-visible:scale-[1.06] focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:border-white ${
        cta === 'watch'
          ? 'border-white/30 hover:border-white'
          : 'border-white/10 hover:border-white/50'
      }`}
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt={title}
          // Top-anchor so fight-poster headers (logos / "MAIN EVENT" text)
          // stay visible if the source aspect doesn't match exactly.
          className="absolute inset-0 w-full h-full object-cover [object-position:center_top]"
        />
      ) : (
        <pre
          aria-hidden
          className="absolute inset-0 m-0 p-0 font-mono text-[10px] leading-[0.95] tracking-tight text-white/15 overflow-hidden whitespace-pre flex items-start justify-center pt-2 select-none"
        >
          {ASCII_PLACEHOLDER}
        </pre>
      )}
      {/* Title strip — kept short so the poster art reads cleanly above it. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 pt-6 pb-3">
        <p className="text-sm font-bold text-white line-clamp-2 leading-tight">
          {title}
        </p>
        {subtitle && (
          <p
            className={`mt-1 text-[11px] tracking-wider ${
              cta === 'watch' ? 'text-white/80' : 'text-gray-400'
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {cta === 'watch' && (
        <span className="absolute top-2 right-2 text-[10px] tracking-[0.2em] uppercase bg-white text-black px-2 py-1 font-bold">
          Owned
        </span>
      )}
    </button>
  );
}

// ── Buy / Pair sidebar (right-side overlay on item click) ──────────────

function BuyOrPairSidebar({
  selected,
  authed,
  onClose,
  onPair,
}: {
  selected: SelectedItem;
  authed: boolean;
  onClose: () => void;
  onPair: () => void;
}) {
  const buyPath =
    selected.kind === 'vod' ? SITE_BUY_URL_VOD : SITE_BUY_URL_HOME;
  const buyAbsoluteUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${buyPath}` : `https://boxstreamtv.com${buyPath}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(buyAbsoluteUrl)}`;

  const title =
    selected.kind === 'vod' ? selected.product.name : selected.event.name;
  const subtitle =
    selected.kind === 'vod'
      ? selected.product.price
        ? `$${selected.product.price}`
        : 'Replay'
      : selected.event.is_streaming
        ? 'Live Now'
        : 'Upcoming PPV';
  const description =
    selected.kind === 'vod' ? selected.product.description : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <aside
        className="relative w-full max-w-md h-full bg-[#0a0a0a] border-l border-white/15 p-8 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-xs tracking-[0.2em] uppercase text-gray-400 hover:text-white"
        >
          Close
        </button>

        <p className="text-xs font-bold tracking-[0.25em] uppercase text-gray-500 mb-3 mt-2">
          {subtitle}
        </p>
        <h3 className="text-2xl font-bold tracking-tight mb-3">{title}</h3>
        {description && (
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">{description}</p>
        )}

        <div className="border border-white/10 bg-white/[0.03] p-6 mb-6">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-white mb-4">
            Buy on Your Phone
          </p>
          <div className="flex gap-5 items-center">
            <div className="bg-white p-2 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="Scan to buy" width={140} height={140} />
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Scan with your phone&apos;s camera to open the buy page on{' '}
              <span className="text-white font-semibold">boxstreamtv.com</span>.
              Once you check out, this TV picks it up automatically.
            </p>
          </div>
        </div>

        {!authed && (
          <div className="border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-white mb-2">
              Already Have Access?
            </p>
            <p className="mb-4 leading-relaxed">
              If you&apos;ve already bought this on the web, sign in here so this TV unlocks it.
            </p>
            <button
              onClick={onPair}
              className="w-full border border-white/30 text-white font-bold py-3 text-xs tracking-[0.2em] uppercase hover:border-white transition-colors"
            >
              Sign in
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
