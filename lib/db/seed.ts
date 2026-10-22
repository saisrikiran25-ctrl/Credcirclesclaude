/**
 * Demo seed. History is REPLAYED through the real business functions with a fake clock
 * ("time machine"), so the ledger, balances, risk scores and statuses are consistent by
 * construction. Run: npm run seed (recreates circlo.db from scratch).
 */
import fs from "node:fs";
import path from "node:path";
import { openDb, schema, type Db } from "./index";
import { rupees } from "@/lib/domain/constants";
import { maskId } from "@/lib/domain/validation";
import { newId } from "@/lib/core/shared";
import { circleInviteCode, contribute, createCircle, joinByInvite, upgradePremium } from "@/lib/core/circles";
import {
  castVote, closeVote, markDefault, payShare, proposeRestructure, repayManual, requestLoan, setupMandate, sweep,
  voteRestructure, loanDetail,
} from "@/lib/core/loans";

const DAY = 24 * 3600 * 1000;
const NOW = new Date();

/** Deterministic PRNG so every fresh seed looks the same. */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261021);

const at = (daysAgo: number, hour = 10, minute = 0) => {
  const d = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate() - daysAgo, hour, minute));
  return d;
};

interface Ev { t: Date; run: () => Promise<void> | void }

async function main() {
  const file = process.env.CIRCLO_DB ?? path.join(process.cwd(), "circlo.db");
  for (const f of [file, `${file}-wal`, `${file}-shm`]) if (fs.existsSync(f)) fs.rmSync(f);
  const { db, raw } = openDb(file);

  // ---------- people ----------
  type P = { key: string; name: string; phone: string; city: string; segment: string; institution?: string; ageDays: number; vetted?: boolean; persona?: string; admin?: boolean };
  const people: P[] = [
    { key: "ananya", name: "Ananya Reddy", phone: "9876500001", city: "Hyderabad", segment: "student", institution: "IIIT Hyderabad", ageDays: 170, persona: "student" },
    { key: "rohan", name: "Rohan Varma", phone: "9876500004", city: "Hyderabad", segment: "student", institution: "IIIT Hyderabad", ageDays: 170 },
    { key: "sneha", name: "Sneha Iyer", phone: "9876500005", city: "Hyderabad", segment: "student", institution: "Osmania University", ageDays: 165 },
    { key: "karthik", name: "Karthik Naidu", phone: "9876500006", city: "Hyderabad", segment: "student", institution: "JNTU Hyderabad", ageDays: 165 },
    { key: "meera", name: "Meera Pillai", phone: "9876500007", city: "Hyderabad", segment: "student", institution: "IIIT Hyderabad", ageDays: 160 },
    { key: "vikram", name: "Vikram Sethi", phone: "9876500002", city: "Hyderabad", segment: "professional", institution: "Product designer, HITEC City", ageDays: 190, persona: "admin" },
    { key: "priya", name: "Priya Menon", phone: "9876500008", city: "Hyderabad", segment: "professional", institution: "Analyst, Gachibowli", ageDays: 185 },
    { key: "neha", name: "Neha Kapoor", phone: "9876500009", city: "Hyderabad", segment: "professional", institution: "Freelance copywriter", ageDays: 185 },
    { key: "kavya", name: "Kavya Nair", phone: "9876500010", city: "Hyderabad", segment: "club", institution: "IIIT-H Robotics Club", ageDays: 185 },
    { key: "imran", name: "Imran Sheikh", phone: "9876500003", city: "Hyderabad", segment: "microentrepreneur", institution: "Sheikh Print & Merch", ageDays: 120, vetted: true, persona: "professional" },
    { key: "divya", name: "Divya Hegde", phone: "9876500011", city: "Bengaluru", segment: "professional", institution: "Freelance UX writer", ageDays: 125 },
    { key: "nikhil", name: "Nikhil Gowda", phone: "9876500012", city: "Bengaluru", segment: "microentrepreneur", institution: "Gowda Cycles", ageDays: 120 },
    { key: "pooja", name: "Pooja Shetty", phone: "9876500013", city: "Bengaluru", segment: "professional", ageDays: 118 },
    { key: "ishaan", name: "Ishaan Kulkarni", phone: "9876500014", city: "Pune", segment: "student", institution: "COEP Pune", ageDays: 100 },
    { key: "tanvi", name: "Tanvi Joshi", phone: "9876500015", city: "Pune", segment: "professional", institution: "Junior developer", ageDays: 100 },
    { key: "omkar", name: "Omkar Patil", phone: "9876500016", city: "Pune", segment: "student", institution: "MIT-WPU Pune", ageDays: 25 },
    { key: "circloadmin", name: "Circlo Admin", phone: "9876500000", city: "Hyderabad", segment: "professional", ageDays: 200, admin: true },
  ];
  const U: Record<string, string> = {};
  for (const p of people) {
    const id = newId();
    U[p.key] = id;
    const slug = p.name.toLowerCase().split(" ")[0];
    db.insert(schema.users).values({
      id, phone: p.phone, name: p.name, city: p.city, segment: p.segment,
      vpa: `${slug}@okaxis`.replace("okaxis", ["oksbi", "okhdfcbank", "okaxis", "ybl", "paytm"][people.indexOf(p) % 5]),
      institution: p.institution ?? null, kycStatus: "verified", vetted: p.vetted ?? false, isPlatformAdmin: p.admin ?? false,
      demoPersona: p.persona ?? null, createdAt: new Date(NOW.getTime() - p.ageDays * DAY),
    }).run();
    db.insert(schema.kycRecords).values({
      id: newId(), userId: id, idType: people.indexOf(p) % 2 === 0 ? "pan" : "aadhaar",
      maskedId: maskId(people.indexOf(p) % 2 === 0 ? `ABCDE${1000 + people.indexOf(p)}F` : `23456789${1000 + people.indexOf(p)}`),
      provider: "simulated", verifiedAt: new Date(NOW.getTime() - p.ageDays * DAY),
    }).run();
  }

  const ids: Record<string, string> = {}; // circles and loans by key
  const evs: Ev[] = [];
  const on = (t: Date, run: () => Promise<void> | void) => evs.push({ t, run });

  // ---------- circles ----------
  const circleDefs = [
    { key: "c2", name: "HITEC City Young Pros", type: "professionals", city: "Hyderabad", admin: "vikram", members: ["priya", "neha", "kavya"], created: 180,
      rules: { maxLoan: rupees(20000), interestPct: 9, approvalThresholdPct: 70, latePenaltyType: "pct" as const, latePenaltyValue: 2, votingWindowHours: 48 },
      desc: "Early-career friends pooling idle cash for upskilling and small business needs." },
    { key: "c1", name: "Gachibowli Hostel Gang", type: "hostel", city: "Hyderabad", admin: "rohan", members: ["ananya", "sneha", "karthik", "meera"], created: 150,
      rules: { maxLoan: rupees(10000), interestPct: 10, approvalThresholdPct: 70, latePenaltyType: "flat" as const, latePenaltyValue: rupees(50), votingWindowHours: 48 },
      desc: "Third-floor hostel crew. Small loans for fees, gadgets and emergencies." },
    { key: "c3", name: "IIIT-H Robotics Club", type: "club", city: "Hyderabad", admin: "kavya", members: ["rohan", "ananya", "meera"], created: 125,
      rules: { maxLoan: rupees(15000), interestPct: 8, approvalThresholdPct: 75, latePenaltyType: "flat" as const, latePenaltyValue: rupees(100), votingWindowHours: 48 },
      desc: "Club treasury and member welfare fund for events and project parts." },
    { key: "c4", name: "Koramangala Freelancers", type: "friends", city: "Bengaluru", admin: "divya", members: ["nikhil", "pooja"], created: 110,
      rules: { maxLoan: rupees(12000), interestPct: 12, approvalThresholdPct: 70, latePenaltyType: "flat" as const, latePenaltyValue: rupees(100), votingWindowHours: 48 },
      desc: "Freelancers and small sellers helping each other through lean months." },
    { key: "c5", name: "FC Road Friends", type: "friends", city: "Pune", admin: "ishaan", members: ["tanvi", "omkar"], created: 25,
      rules: { maxLoan: rupees(10000), interestPct: 10, approvalThresholdPct: 70, latePenaltyType: "flat" as const, latePenaltyValue: rupees(50), votingWindowHours: 48 },
      desc: "Pune friends, new circle, learning the ropes." },
  ];
  for (const c of circleDefs) {
    on(at(c.created, 9), () => {
      ids[c.key] = createCircle(db, U[c.admin], { type: c.type, name: c.name, description: c.desc, city: c.city, rules: c.rules }, at(c.created, 9));
    });
    c.members.forEach((m, i) =>
      on(at(c.created - 1, 9, i), () => { joinByInvite(db, U[m], circleInviteCode(db, ids[c.key])!, at(c.created - 1, 9, i)); }),
    );
  }

  // ---------- contributions (monthly rounds, deterministic jitter) ----------
  const base: Record<string, Record<string, number>> = {
    c2: { vikram: 4000, priya: 3000, neha: 2500, kavya: 2000 },
    c1: { rohan: 2000, ananya: 1500, sneha: 1000, karthik: 1500, meera: 1000 },
    c3: { kavya: 2000, rohan: 3000, ananya: 1500, meera: 1500 },
    c4: { divya: 3000, nikhil: 2000, pooja: 2000 },
    c5: { ishaan: 2500, tanvi: 2000, omkar: 1000 },
  };
  const rounds: Record<string, number[]> = {
    c2: [179, 149, 119, 89, 59, 29],
    c1: [149, 119, 89, 59, 29],
    c3: [124, 94, 64, 34, 4],
    c4: [109, 79, 49, 19],
    c5: [24, 17, 10],
  };
  for (const [ck, rds] of Object.entries(rounds)) {
    for (const d of rds) {
      Object.entries(base[ck]).forEach(([m, amt], i) => {
        if (rand() < 0.07) return; // an occasional missed month
        const jitter = rand() < 0.3 ? 500 : 0;
        const amount = Math.min(rupees(5000), Math.max(rupees(500), rupees(amt) + rupees(jitter)));
        on(at(d, 11, i * 3), async () => {
          await contribute(db, U[m], ids[ck], amount, "success", at(d, 11, i * 3));
        });
      });
    }
  }
  // one failed UPI attempt that was retried, so the ledger shows both
  on(at(59, 12, 30), async () => { await contribute(db, U.sneha, ids.c1, rupees(1000), "failure", at(59, 12, 30)); });
  on(at(59, 12, 40), async () => { await contribute(db, U.sneha, ids.c1, rupees(1000), "success", at(59, 12, 40)); });
  on(at(90, 10), () => { upgradePremium(db, U.vikram, ids.c2, rupees(99), at(90, 10)); });

  // ---------- loan helpers ----------
  const approveAll = (key: string, circle: string, borrower: string, voters: string[], reqD: number, voteD: number, spec: { amount: number; purpose: string; tenure: number; rate: number; note?: string }) => {
    on(at(reqD, 10), () => {
      ids[key] = requestLoan(db, U[borrower], ids[circle], { amount: rupees(spec.amount), purpose: spec.purpose, tenureMonths: spec.tenure, interestPct: spec.rate, note: spec.note }, at(reqD, 10));
    });
    voters.forEach((v, i) => on(at(voteD, 9 + i, 15), () => { castVote(db, U[v], ids[key], "approve", i === 0 ? "Happy to back this." : undefined, at(voteD, 9 + i, 15)); }));
  };
  const payAllShares = (key: string, d: number) =>
    on(at(d, 12), async () => {
      const borrowerId = db.select().from(schema.loans).all().find((l) => l.id === ids[key])!.borrowerId;
      const det = loanDetail(db, ids[key], borrowerId, at(d, 12));
      let i = 0;
      for (const l of det.lenders) { const t = at(d, 12, i++); const r = await payShare(db, l.lenderId, ids[key], "success", t); if (!r.ok) throw new Error("seed: share failed"); }
    });
  const repay = (key: string, borrower: string, d: number, hour = 10) =>
    on(at(d, hour), async () => { const r = await repayManual(db, U[borrower], ids[key], "success", at(d, hour)); if (!r.ok) throw new Error("seed: repay failed"); });

  // ===== C1 Gachibowli Hostel Gang =====
  // L1: Karthik, closed, paid on time
  approveAll("L1", "c1", "karthik", ["rohan", "ananya", "sneha"], 118, 117, { amount: 6000, purpose: "education", tenure: 3, rate: 10, note: "Semester lab fee" });
  payAllShares("L1", 116);
  repay("L1", "karthik", 86); repay("L1", "karthik", 56); repay("L1", "karthik", 26);
  // L4: Meera, overdue with a penalty; first instalment paid late
  approveAll("L4", "c1", "meera", ["rohan", "ananya", "sneha"], 78, 77, { amount: 5000, purpose: "emergency", tenure: 2, rate: 10, note: "Medical bill for a family member" });
  payAllShares("L4", 75);
  repay("L4", "meera", 40);
  // L2: Ananya, first instalment due in about two days
  approveAll("L2", "c1", "ananya", ["rohan", "sneha", "karthik"], 31, 30, { amount: 8000, purpose: "education", tenure: 4, rate: 10, note: "Certification course fee" });
  payAllShares("L2", 28);
  // L3: Sneha, vote in progress (Ananya has not voted yet)
  on(at(1, 10), () => { ids.L3 = requestLoan(db, U.sneha, ids.c1, { amount: rupees(5000), purpose: "gadgets", tenureMonths: 2, interestPct: 10, note: "Second-hand laptop for coursework" }, at(1, 10)); });
  on(at(1, 11), () => { castVote(db, U.rohan, ids.L3, "approve", "Needs one for placements.", at(1, 11)); });
  on(at(1, 15), () => { castVote(db, U.karthik, ids.L3, "approve", undefined, at(1, 15)); });

  // ===== C2 HITEC City Young Pros =====
  // L5: Neha, 6 months, missed one then restructured
  approveAll("L5", "c2", "neha", ["vikram", "priya", "kavya"], 103, 102, { amount: 15000, purpose: "skills", tenure: 6, rate: 9, note: "UX writing bootcamp + laptop" });
  payAllShares("L5", 100);
  repay("L5", "neha", 70); repay("L5", "neha", 40);
  on(at(5, 10), () => { proposeRestructure(db, U.neha, ids.L5, 4, "Two client payments slipped. I need a longer schedule.", at(5, 10)); });
  ["vikram", "priya", "kavya"].forEach((v, i) =>
    on(at(4, 10, i * 5), () => {
      const p = loanDetail(db, ids.L5, U.vikram, at(4, 10, i * 5)).proposal!;
      voteRestructure(db, U[v], p.id, "approve", at(4, 10, i * 5));
    }),
  );
  // L6: Imran, vetted external borrower, AutoPay, first instalment auto-debited
  approveAll("L6", "c2", "imran", ["vikram", "priya", "kavya"], 43, 42, { amount: 12000, purpose: "business", tenure: 3, rate: 11, note: "Heat press and merch inventory for the semester rush" });
  payAllShares("L6", 40);
  on(at(39, 10), async () => { await setupMandate(db, U.imran, ids.L6, at(39, 10)); });
  // L7: Priya, approved yesterday, lenders have not paid yet (Vikram must pay his share)
  approveAll("L7", "c2", "priya", ["vikram", "neha", "kavya"], 2, 1, { amount: 10000, purpose: "education", tenure: 3, rate: 9, note: "Masters application and exam fees" });

  // ===== C3 IIIT-H Robotics Club =====
  // L9: Rohan, defaulted; loss shared by lenders
  approveAll("L9", "c3", "rohan", ["kavya", "ananya", "meera"], 69, 68, { amount: 8000, purpose: "event", tenure: 2, rate: 8, note: "Hackathon logistics advance" });
  payAllShares("L9", 66);
  on(at(20, 10), () => { markDefault(db, U.kavya, ids.L9, at(20, 10)); });

  // ===== C4 Koramangala Freelancers =====
  approveAll("L10", "c4", "nikhil", ["divya", "pooja"], 73, 72, { amount: 7000, purpose: "business", tenure: 3, rate: 12, note: "Stock of cycle spares" });
  payAllShares("L10", 70);
  repay("L10", "nikhil", 40); repay("L10", "nikhil", 10);

  // ===== C5 FC Road Friends =====
  approveAll("L11", "c5", "tanvi", ["ishaan", "omkar"], 11, 10, { amount: 5000, purpose: "skills", tenure: 2, rate: 10, note: "Cloud certification" });
  payAllShares("L11", 8);
  // L12: Omkar's very first request: "Not enough history" risk state, vote pending
  on(at(1, 9), () => { ids.L12 = requestLoan(db, U.omkar, ids.c5, { amount: rupees(5000), purpose: "emergency", tenureMonths: 2, interestPct: 10 }, at(1, 9)); });

  // ---------- NPS survey answers (simulated) ----------
  [9, 10, 8, 9, 7, 10, 9, 6, 8, 10, 9, 8].forEach((score, i) => {
    db.insert(schema.npsResponses).values({ id: newId(), userId: Object.values(U)[i % 10], score, createdAt: at(30 - i, 12) }).run();
  });

  // ---------- run the time machine: events, then a sweep at the end of every day ----------
  evs.sort((a, b) => a.t.getTime() - b.t.getTime());
  const start = new Date(evs[0].t.getTime());
  let idx = 0;
  for (let day = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())); day.getTime() <= NOW.getTime(); day = new Date(day.getTime() + DAY)) {
    const dayEnd = Math.min(day.getTime() + DAY - 1, NOW.getTime());
    while (idx < evs.length && evs[idx].t.getTime() <= dayEnd) {
      try {
        await evs[idx].run();
      } catch (e) {
        console.error(`Seed step failed at ${evs[idx].t.toISOString()}:`, (e as Error).message);
        throw e;
      }
      idx++;
    }
    sweep(db, new Date(Math.min(day.getTime() + 23 * 3600 * 1000, NOW.getTime())));
  }
  sweep(db, NOW);
  void closeVote; void (null as unknown as Db);

  const n = (t: unknown) => (db as unknown as { $client: { prepare: (s: string) => { get: () => { c: number } } } }).$client.prepare(`select count(*) c from ${t}`).get().c;
  raw.pragma("wal_checkpoint(TRUNCATE)"); // fold the WAL into the main file so the .db can be copied as-is
  console.log(`Seeded: ${n("users")} users, ${n("circles")} circles, ${n("loans")} loans, ${n("ledger_entries")} ledger entries.`);
  console.log("Demo logins (any 6-digit OTP, demo code 123456): Student 9876500001 · Admin/Lender 9876500002 · Young pro 9876500003");
}

main().catch((e) => { console.error(e); process.exit(1); });
