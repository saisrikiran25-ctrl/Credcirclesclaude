import { expect, test, type Page } from "@playwright/test";

/** Collect console and page errors so a silent client crash fails the test. */
function watch(page: Page) {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(`PAGEERROR ${e.message}`));
  return errs;
}

async function loginAs(page: Page, persona: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name: persona }).first().click();
  await page.waitForURL("**/home");
}

const PERSONAS: [string, RegExp][] = [["Ananya", /Student borrower/], ["Vikram", /Circle admin/], ["Imran", /Young pro/]];

for (const [name, re] of PERSONAS) {
  test(`every screen renders for ${name}`, async ({ page }) => {
    const errs = watch(page);
    await loginAs(page, re);
    const seen = new Set<string>();
    const queue = ["/home", "/circles", "/loans", "/ledger", "/profile", "/position", "/notifications", "/risk", "/admin", "/admin/revenue", "/admin/projections", "/contribute", "/loans/new", "/circles/new", "/join"];
    // Follow internal links one level deeper from the list screens (circle tabs, loans, agreements).
    for (const start of ["/circles", "/loans"]) {
      await page.goto(start);
      const hrefs = await page.locator("main a[href^='/circles/'], main a[href^='/loans/']").evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute("href")!));
      for (const h of hrefs.slice(0, 8)) queue.push(h);
    }
    const circleLinks = queue.filter((h) => /^\/circles\/[^/?]+$/.test(h)).slice(0, 2);
    for (const c of circleLinks) for (const tab of ["members", "loans", "ledger", "rules", "performance", "invite"]) queue.push(`${c}?tab=${tab}`);
    for (const l of queue.filter((h) => /^\/loans\/[^/?#]+$/.test(h) && h !== "/loans/new").slice(0, 4)) queue.push(`${l}/agreement`);
    for (const path of queue) {
      if (seen.has(path)) continue;
      seen.add(path);
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      const body = await page.locator("body").innerText();
      expect(body, `error boundary on ${path}`).not.toContain("Something went wrong");
      await expect(page.locator("h1").first(), path).toBeVisible();
    }
    expect(errs, errs.join("\n")).toEqual([]);
  });
}

test("golden path: vote, contribute, pay a lender share, see it in the ledger", async ({ page }) => {
  const errs = watch(page);

  // Ananya approves Sneha's open request.
  await loginAs(page, /Student borrower/);
  await page.getByRole("link", { name: /Vote: Sneha/ }).click();
  await expect(page.getByRole("heading", { name: "The vote" })).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  // Ananya's approval is the one that reaches the 70% threshold, so the loan moves to the UPI payout stage.
  await expect(page.getByRole("heading", { name: "Lenders pay the borrower by UPI" })).toBeVisible();

  // Ananya contributes via the simulated UPI sheet.
  await page.goto("/contribute");
  await page.getByRole("button", { name: /^Contribute ₹1,000/ }).click();
  await page.getByRole("button", { name: /^Pay ₹1,000/ }).click();
  await expect(page.getByText("Added to the circle ledger")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForURL(/\/circles\//);

  // Switch user: Vikram pays his share of Priya's approved loan.
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: /Vikram/ }).click();
  await page.waitForURL("**/home");
  await page.getByRole("link", { name: /Pay .* to Priya/ }).click();
  await page.getByRole("button", { name: /^Pay ₹.* to Priya/ }).click();
  await page.getByRole("button", { name: /^Pay ₹/ }).last().click();
  await expect(page.getByText("Your share is recorded")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Done" }).click();

  // The ledger shows a contribution and exports as CSV.
  await page.goto("/ledger");
  await expect(page.getByText("Contribution").first()).toBeVisible();
  const csv = await page.request.get("/ledger/export");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("reference,date_time_ist,circle,type,status,amount_inr");
  expect(errs, errs.join("\n")).toEqual([]);
});

test("a failed UPI payment records nothing and can be retried", async ({ page }) => {
  await loginAs(page, /Student borrower/);
  await page.goto("/contribute");
  await page.getByRole("button", { name: /^Contribute ₹1,000/ }).click();
  await page.getByRole("button", { name: "Simulate a failed payment" }).click();
  await expect(page.getByText("Payment failed.")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /^Retry/ }).click();
  await expect(page.getByText("Added to the circle ledger")).toBeVisible({ timeout: 10_000 });
});

test("new user: sign up with simulated eKYC, create a circle, get an invite code", async ({ page }) => {
  const errs = watch(page);
  await page.goto("/signup");
  await page.getByLabel("Mobile number").fill("9123456780");
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Enter the 6-digit code").fill("123456");
  await page.getByRole("button", { name: "Verify" }).click();
  await page.getByLabel("PAN number").fill("ABCDE1234F");
  await page.getByRole("button", { name: "Check ID" }).click();
  await page.getByLabel("Enter the 6-digit code").fill("123456");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("Verified", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Full name").fill("Test Student");
  await page.getByLabel("UPI ID (VPA)").fill("test.student@upi");
  await page.getByRole("button", { name: "Create my account" }).click();
  await page.waitForURL("**/home**");
  await expect(page.getByText("You are verified and in.")).toBeVisible();

  await page.goto("/circles/new");
  await page.getByLabel("Circle name").fill("Smoke Test Circle");
  await page.getByRole("button", { name: /Create circle/ }).click();
  await page.waitForURL(/\/circles\/.*tab=invite/);
  await expect(page.getByText("Invite code", { exact: true })).toBeVisible();
  expect(errs, errs.join("\n")).toEqual([]);
});

test("smart search suggests results as you type and supports the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/login");
  await page.getByRole("button", { name: /Student borrower/ }).first().click();
  await page.waitForURL("**/home");
  const box = page.getByRole("combobox", { name: /Search circles/ }).first();
  await box.fill("gachbowli"); // deliberate typo
  const opt = page.getByRole("option", { name: /Gachibowli Hostel Gang/ }).first();
  await expect(opt).toBeVisible();
  await box.press("ArrowDown");
  await box.press("Enter");
  await page.waitForURL(/\/circles\//);
  await page.keyboard.press("/");
  await expect(box).toBeFocused();
  await box.fill("ledg");
  await expect(page.getByRole("option", { name: /Ledger/ }).first()).toBeVisible();
});
