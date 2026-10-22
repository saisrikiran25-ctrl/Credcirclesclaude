# Decisions

Where the build prompt and the business description disagreed, the business description won. Each choice below is open to change.

## Stack
- **Drizzle ORM + better-sqlite3 instead of Prisma.** Prisma's engine download was blocked in the build sandbox (HTTP 403), so it could not be installed. Drizzle is pure TypeScript, synchronous, and runs migrations at start-up. Behaviour for the user is identical.
- **Next.js 16, App Router, fully dynamic** (`cacheComponents` off). Every screen reads live per-user data, so caching would only risk stale money figures.
- **Tailwind v4, self-hosted fonts** (no external font requests), `serverExternalPackages: better-sqlite3`.

## Money and the ledger
- **All money is integer paise**, formatted with Indian grouping. Splits use the largest-remainder method so shares always add up exactly.
- **Ledger is append-only**, enforced by SQLite triggers that reject UPDATE and DELETE. Corrections are `REVERSAL` entries. `appendLedger` is the only write path.
- **Pool = contributions − disbursed + principal repaid + interest + penalties.** The platform fee is paid borrower → platform and never enters the pool. A write-off shrinks what is outstanding but does not change the pool.
- **Platform fee** 1.5% of principal (within the 1–2.5% band), paid by the borrower.

## Lending rules
- **Simple (flat) interest**, charged on the original principal, equal principal split, monthly instalments. Easy for students to read; the formula is shown in the form.
- **One open loan per borrower per circle.**
- **Voting:** required approvals = ceil(eligible × threshold%). The borrower does not vote on their own loan; for an outside borrower every member votes. Rejection ends the vote early once approval is mathematically impossible.
- **Lender split:** the fewest lenders (max 4) with the most spare capacity, proportional to capacity. Each pays their own share by UPI; the loan starts when all shares are paid.
- **Rule edits apply to new loans only.** Each loan stores a snapshot of the rules when requested; members are notified of edits.
- **Restructure:** the unpaid principal is re-spread over a new tenure after a member vote; old instalments are kept as `superseded` for history.
- **Default:** the admin marks a long-overdue loan defaulted; unpaid principal is written off and shared by lenders in proportion to what each funded. The pool is not topped up from others.
- **Outside borrowers** (Compliance Mode A only) must be vetted (admin-flagged or risk score 60+). Mode C is members-only.

## Risk score (explainable, 0 to 100)
Repayment 35 · time on platform 15 · past approvals 15 · current exposure 20 · verification 15. Bands: 75+ low, 50–74 medium, below 50 high. A default on record caps the score at 49 (found in testing: a defaulter scored 64 without it). With no repayment record and under 30 days on the platform the UI says **"Not enough history"** instead of showing a low score.

## Simulation
- eKYC, UPI settle, AutoPay mandate and the partner escrow are interfaces with simulated implementations (`lib/services`). Every simulated screen says so. Demo OTP is `123456`.
- Only the **last four characters** of PAN/Aadhaar are stored. The signup step carries an HMAC token so the browser cannot fake a passed KYC.
- A failed UPI payment writes a `failed` ledger entry that never counts toward the pool, and can be retried.
- UPI payment sheets do not refresh the page until the user taps Done, so the success state is not lost when the last lender's payment starts the loan.

## Scope calls
- **Platform admin pages (Pilot Metrics, Revenue, Projections) are open to every signed-in user** in the demo and say so. In production they would be staff-only.
- **Projections are labelled "Illustrative"** and copied as written. **The business description's Year 1 revenue does not follow from its own inputs:** 1.5% of ₹50 lakh is ₹75,000, not ₹7.5 lakh. Years 2 and 3 do reconcile (2% of ₹10 cr = ₹20 lakh; 2% of ₹100 cr = ₹2 cr). The page flags this so nobody quotes the Year 1 figure.
- Notifications are in-app only; the PWA caches the shell for offline reading but money actions need a connection.
- Auto-invest, micro-investment/insurance cross-sell, the B2B SaaS card and Option B (licensed NBFC-P2P) are visible **"Coming soon / Roadmap"** cards, not working features.
- Language: English only, with `lib/i18n.ts` as the hook for Hindi and Telugu.
- Legal pages and the loan agreement are **placeholders** to be replaced by counsel.

## Seed data
"Time machine": history is replayed through the real core functions with a fake clock and a daily sweep, so the seeded ledger, penalties and risk scores are produced by the same code that runs live, not hand-written rows.

## Hosting on Vercel
- **Stateless signed login cookie** (`<userId>.<HMAC>`) replaces the sessions table, so a login keeps working across several serverless instances.
- **Database seeded at build time** and copied to `/tmp` on first use on Vercel. Runtime changes are per instance and temporary. A hosted database is the real fix.
