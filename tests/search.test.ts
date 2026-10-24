import { describe, expect, it } from "vitest";
import { PAGE_ITEMS, editDistance, rank, type SearchItem } from "@/lib/search";

const items: SearchItem[] = [
  { kind: "circle", id: "c1", href: "/circles/c1", title: "Gachibowli Hostel Gang", sub: "5 members · Hyderabad", keywords: "hostel circle group" },
  { kind: "circle", id: "c2", href: "/circles/c2", title: "IIIT-H Robotics Club", sub: "4 members · Hyderabad", keywords: "club" },
  { kind: "loan", id: "l1", href: "/loans/l1", title: "₹5,000 · Sneha Iyer", sub: "Gadgets / lifestyle · Gachibowli Hostel Gang", keywords: "Sneha Iyer voting loan 5000" },
  { kind: "person", id: "u1", href: "/risk?user=u1", title: "Karthik Naidu", sub: "Person in your circles", keywords: "member" },
  ...PAGE_ITEMS,
];
const top = (q: string) => rank(items, q).map((h) => h.id);

describe("search ranking", () => {
  it("matches word prefixes", () => expect(top("gac")[0]).toBe("c1"));
  it("tolerates a typo", () => { expect(top("gachbowli")).toContain("c1"); expect(top("robotcs")).toContain("c2"); });
  it("requires every typed word to match (AND)", () => { expect(top("hostel sneha")).toEqual(["l1"]); expect(top("hostel zzzz")).toEqual([]); });
  it("finds loans by amount with or without formatting", () => { expect(top("5000")).toContain("l1"); expect(top("₹5,000")).toContain("l1"); });
  it("never fuzzy-matches numbers", () => { const hit = rank([{ kind: "loan", id: "x", href: "/", title: "₹8,000 · Rohan", sub: "", keywords: "8000" }], "5000"); expect(hit).toEqual([]); });
  it("finds pages by synonym", () => { expect(top("borrow")).toContain("loan-new"); expect(top("statement")).toContain("ledger"); });
  it("ignores accents and case", () => expect(top("KARTHIK")).toEqual(["u1"]));
  it("returns nothing for empty input and caps results", () => { expect(rank(items, "  ")).toEqual([]); expect(rank(items, "a", { limit: 3 }).length).toBeLessThanOrEqual(3); });
  it("groups results by kind", () => { const kinds = rank(items, "hostel").map((h) => h.kind); expect(kinds).toEqual([...kinds].sort((a, b) => ["circle", "loan", "person", "page"].indexOf(a) - ["circle", "loan", "person", "page"].indexOf(b))); });
  it("edit distance bails out early", () => { expect(editDistance("kitten", "sitten", 1)).toBe(1); expect(editDistance("abc", "xyzxyz", 1)).toBeGreaterThan(1); });
});
