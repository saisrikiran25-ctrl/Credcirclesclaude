# Circlo: SHG for Gen Z

A working, demo-ready prototype of **Community Credit Circles for Students and Young Adults**: small invite-only groups of verified people who pool contributions in a ledger, vote on loans, lend to each other by UPI, and see every rupee. **UPI, eKYC, AutoPay and the NBFC-P2P partner are simulated. No real money moves.** Circlo is a connector and a ledger only; it never holds a wallet.

## Run it

```bash
npm install
npm run seed      # creates circlo.db with 17 users, 5 circles, 11 loans, 131 ledger entries
npm run dev       # http://localhost:3000
```

Other commands: `npm run build` · `npm start` · `npm test` (67 unit and lifecycle tests) · `npm run test:e2e` (Playwright smoke tests; builds nothing, so run `npm run build` first).

Needs Node 20+. Set `CIRCLO_DB` to use a different database file.

## Demo in 2 minutes

Open the welcome page and tap a persona (or log in with the phone and any 6-digit code; the demo OTP is `123456`).

| Persona | Phone | What to try |
|---|---|---|
| **Ananya**, student borrower | 9876500001 | Vote on Sneha's request; her own instalment is due in ~2 days; set up AutoPay |
| **Vikram**, circle admin / lender | 9876500002 | Pay his UPI share to Priya; edit rules; switch Compliance Mode; Circle Premium |
| **Imran**, young pro / outside borrower | 9876500003 | AutoPay loan in another circle; borrow as a vetted outsider |
| Platform admin | 9876500000 | Same app; Pilot Metrics, Revenue, Projections under Profile |

Use the account menu (top right) to switch persona at any time. Seeded circles show: a closed loan, a restructured loan, an overdue loan with a late penalty, a defaulted loan with lender loss shares, an open vote, and an approved loan awaiting UPI payments.

## What is where

- `app/` Next.js App Router screens (`(public)` welcome, login, signup, explainers, legal; `(app)` the signed-in product)
- `lib/domain/` pure, unit-tested rules: money, EMI, voting, risk score, exposure, penalties, risk sharing, ledger totals
- `lib/core/` business operations on the database (create circle, request loan, vote, pay, repay, restructure, default, sweep)
- `lib/services/` the simulated eKYC, UPI and partner-escrow behind interfaces (swap for real providers)
- `lib/db/` Drizzle schema, migrations, and the seed (which replays history through the real functions on a fake clock)
- `tests/` unit and lifecycle tests · `e2e/` Playwright smoke tests

See `DECISIONS.md` for why things are built the way they are, and `FEATURE_MAP.md` for how each section of the business description maps to the product.

## Honest limits

Prototype only: simulated payments and identity, SQLite storage, placeholder legal text, no real notifications (in-app only), English only (a string hook exists for Hindi and Telugu). Not legal or financial advice. Lending carries risk of loss.
