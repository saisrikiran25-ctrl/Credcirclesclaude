/**
 * Smart search: a tiny in-memory index over what the signed-in user can already see (their circles,
 * loans, the people in their circles, and key pages), ranked with word-prefix, substring and
 * typo-tolerant (edit distance) matching. Pure functions so it can be unit tested.
 */
export type SearchKind = "circle" | "loan" | "person" | "page";
export type SearchItem = { kind: SearchKind; id: string; href: string; title: string; sub: string; keywords: string };
export type SearchHit = SearchItem & { score: number };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[₹,]/g, "");
export const tokens = (s: string) => norm(s).split(/[^a-z0-9.]+/).filter(Boolean);

/** Levenshtein distance, bailing out early once it must exceed `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function tokenScore(q: string, t: string): number {
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (q.length >= 2 && t.includes(q)) return 50;
  if (/\d/.test(q) || /\d/.test(t)) return 0; // numbers match exactly, never "fuzzily" (5000 is not 8000)
  if (q.length >= 3 && editDistance(q, t.slice(0, q.length), 1) <= 1) return 40; // typo in a prefix: "gachbowli"
  if (q.length >= 4 && editDistance(q, t, 1) <= 1) return 35;
  if (q.length >= 6 && editDistance(q, t, 2) <= 2) return 25;
  return 0;
}

export function scoreItem(item: SearchItem, qTokens: string[]): number {
  const title = tokens(item.title);
  const rest = tokens(`${item.sub} ${item.keywords}`);
  let total = 0;
  for (const q of qTokens) {
    const a = Math.max(0, ...title.map((t) => tokenScore(q, t))) * 1.5;
    const b = Math.max(0, ...rest.map((t) => tokenScore(q, t)));
    const best = Math.max(a, b);
    if (best === 0) return 0; // every word the user typed must match something
    total += best;
  }
  return total;
}

const KIND_ORDER: SearchKind[] = ["circle", "loan", "person", "page"];
const KIND_BOOST: Record<SearchKind, number> = { circle: 6, loan: 4, person: 2, page: 0 };

export function rank(items: SearchItem[], query: string, opts: { perKind?: number; limit?: number } = {}): SearchHit[] {
  const { perKind = 4, limit = 10 } = opts;
  const q = tokens(query);
  if (q.length === 0) return [];
  const hits = items
    .map((it) => ({ ...it, score: scoreItem(it, q) }))
    .filter((h) => h.score > 0)
    .map((h) => ({ ...h, score: h.score + KIND_BOOST[h.kind] }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const counts: Record<string, number> = {};
  const out: SearchHit[] = [];
  for (const h of hits) {
    counts[h.kind] = (counts[h.kind] ?? 0) + 1;
    if (counts[h.kind] <= perKind) out.push(h);
  }
  // group by kind in a stable order, keeping score order inside each group
  return out.slice(0, limit * 2).sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)).slice(0, limit);
}

export const PAGE_ITEMS: SearchItem[] = [
  { kind: "page", id: "position", href: "/position", title: "My position", sub: "Lent, borrowed and earnings", keywords: "portfolio net worth balance returns profit interest" },
  { kind: "page", id: "ledger", href: "/ledger", title: "Ledger", sub: "Every rupee movement, CSV export", keywords: "transactions history statement export csv payments" },
  { kind: "page", id: "risk", href: "/risk", title: "Risk score", sub: "How your score is built", keywords: "credit trust rating safe" },
  { kind: "page", id: "contribute", href: "/contribute", title: "Contribute", sub: "Add to a circle's pool", keywords: "deposit add money invest save pool" },
  { kind: "page", id: "loan-new", href: "/loans/new", title: "Request a loan", sub: "Ask your circle", keywords: "borrow apply credit money emergency" },
  { kind: "page", id: "circle-new", href: "/circles/new", title: "Create a circle", sub: "Start a new group", keywords: "new group start hostel club friends" },
  { kind: "page", id: "join", href: "/join", title: "Join with a code", sub: "Enter an invite code", keywords: "invite code member" },
  { kind: "page", id: "notifications", href: "/notifications", title: "Notifications", sub: "Alerts and reminders", keywords: "alerts bell updates inbox" },
  { kind: "page", id: "profile", href: "/profile", title: "Profile and settings", sub: "Account, theme, logout", keywords: "account settings dark mode theme logout kyc autopay" },
  { kind: "page", id: "learn-how", href: "/learn/how-circles-work", title: "How circles work", sub: "Explainer", keywords: "help guide learn basics" },
  { kind: "page", id: "learn-risk", href: "/learn/risk-sharing", title: "How losses are shared", sub: "Explainer", keywords: "default loss risk help guide" },
];
