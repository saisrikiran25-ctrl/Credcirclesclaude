# Feature map: business description → product

| § | Business description | Where it lives |
|---|---|---|
| 1 | One-line summary | Welcome page (`app/(public)/page.tsx`), `lib/config.ts` |
| 2 | The problem | Welcome page "why" section; explainer *How circles work* |
| 3 | The solution: circles, logical pool, collective decisions, direct UPI, transparent ledger, modest interest and risk sharing | Circles (`/circles`), Contribute (`/contribute`), Loans (`/loans`), Ledger (`/ledger` + CSV), explainers *Risk sharing*, *Where your money stays* |
| 4 | Target customers (students, young professionals, clubs, microentrepreneurs) | Signup segments (`lib/config.ts`), circle types, 3 demo personas |
| 5 | Value proposition | Welcome page; plain-language rules and cost previews on the loan form; risk score screen (`/risk`) |
| 6 | How it works: signup + eKYC, invite-only circles, rules, contributions, loan request with risk/liquidity/exposure, vote, UPI link/QR, repay by AutoPay or manual UPI, dashboards | `/signup` wizard; `/circles/new` and `/join/[code]`; Rules tab; `/contribute`; `/loans/new`; vote card on `/loans/[id]`; UPI sheet with link and QR; AutoPay panel and manual repay; *My position* (`/position`) and *Circle position* (circle Overview) |
| 7 | Revenue model: platform fee 1–2.5%, Circle Premium ₹50–₹200, cross-sell, B2B | Fee on every loan (default 1.5%); Premium panel (Performance tab); `/admin/revenue`; "Coming soon"/"Roadmap" cards on Profile |
| 8 | Competitive landscape | Not a product feature. Positioning shown in explainers (connector, not a lender or wallet) |
| 9 | Regulatory strategy | Compliance Mode A (Partnered, simulated escrow stages) and Mode C (Closed); toggle in Rules tab; "money stays in your bank" copy; Option B roadmap card |
| 10 | Key risks and mitigations | Risk score with caps; exposure nudges; late penalties; restructure and mediation; default with lender risk sharing; invite-only verified members; risk disclosure copy |
| 11 | Go-to-market plan | Invite links and QR codes (Invite tab); Pilot Metrics target of 50–100 circles (`/admin`) |
| 12 | Financial projections (illustrative) | `/admin/projections`, labelled Illustrative, Year 1 arithmetic flagged |
| 13 | Team and organisation | Out of scope for a product prototype |
| 14 | Funding and milestones | Pilot Metrics: active circles, on-time rate, retention, NPS, average pool, AUM, take rate |
| 15 | Long-term vision | Roadmap cards (auto-invest, cross-sell, B2B, Option B); `lib/i18n.ts` multilingual hook |
| 16 | Immediate next steps (legal, product, partnerships, compliance) | Placeholder Terms, Privacy and loan agreement; simulated partner interfaces in `lib/services` ready to swap for real providers; NPS widget on Profile |
