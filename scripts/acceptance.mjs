// Spec §8 acceptance walk-through in a real browser. Needs a running app and Playwright:
//   pnpm build && pnpm start -p 3210 &   then   node scripts/acceptance.mjs
// PLAYWRIGHT_MODULE overrides where Playwright is loaded from (default: the "playwright" package).
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const OUT = new URL("../docs/runs/acceptance", import.meta.url).pathname;
const log = [];
const step = (s) => { log.push(s); console.log(s); };
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (n) => iso(new Date(Date.now() + n * 86400000));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

// 1. cargo + trailer, 25 kg, 7 days → discount → ref
await page.goto(BASE);
await page.screenshot({ path: `${OUT}/1-home.png`, fullPage: true });
await page.click("text=Longtail Cargo >> xpath=ancestor::li >> text=Book this bike");
await page.fill('input[type=date] >> nth=0', plus(3));
await page.fill('input[type=date] >> nth=1', plus(9));
await page.check("text=Dog trailer");
await page.fill("text=Dog weight (kg) >> input", "25");
await page.fill("text=Your name >> input", "Halyna");
await page.fill("text=Email >> input", "halyna@example.com");
await page.waitForSelector("text=7+ days discount");
const total = await page.locator("dt.font-semibold + dd").textContent();
step(`1. 7 days cargo+trailer: discount shown, total ${total}`);
await page.screenshot({ path: `${OUT}/2-quote-discount.png`, fullPage: true });
await page.click("button:has-text('Book')");
const ref = (await page.locator("code").textContent()).trim();
step(`1. booked → ref ${ref}`);
await page.screenshot({ path: `${OUT}/3-confirmation.png`, fullPage: true });

// 2. basket on a bike without front rack is disabled
await page.goto(`${BASE}/book/trek-explorer`);
await page.waitForSelector("text=Dog gear (optional)");
const basketDisabled = await page.locator("label:has-text('Front basket') input").isDisabled();
const reason = await page.locator("text=Needs a bike with a front rack").isVisible();
step(`2. trekking bike: basket disabled=${basketDisabled}, reason visible=${reason}`);
await page.screenshot({ path: `${OUT}/4-basket-disabled.png`, fullPage: true });

// 3. last trailer, overlapping dates, other bike → not available
await page.goto(`${BASE}/book/e-cruiser`);
await page.waitForSelector("text=Dog gear (optional)");
await page.fill('input[type=date] >> nth=0', plus(5));
await page.fill('input[type=date] >> nth=1', plus(6));
await page.check("text=Dog trailer");
await page.fill("text=Dog weight (kg) >> input", "20");
await page.fill("text=Your name >> input", "Second");
await page.fill("text=Email >> input", "second@example.com");
await page.waitForTimeout(400);
await page.click("button:has-text('Book')");
const alert = await page.locator("main [role=alert]").textContent();
step(`3. second booking of last trailer → "${alert}"`);
await page.screenshot({ path: `${OUT}/5-trailer-unavailable.png`, fullPage: true });

// 4. lookup wrong email → not found; right email → cancel → trailer free again
await page.goto(`${BASE}/booking`);
await page.fill("text=Booking reference >> input", ref.toLowerCase());
await page.fill("text=Email used for the booking >> input", "wrong@example.com");
await page.click("button:has-text('Find booking')");
step(`4. wrong email → "${await page.locator("main [role=alert]").textContent()}"`);
await page.fill("text=Email used for the booking >> input", "HALYNA@example.com");
await page.click("button:has-text('Find booking')");
await page.waitForSelector("text=Active");
await page.click("text=Cancel booking");
await page.click("text=Yes, cancel");
await page.waitForSelector("text=Cancelled");
step("4. right email → found → cancelled");
await page.screenshot({ path: `${OUT}/6-cancelled.png`, fullPage: true });

await page.goto(`${BASE}/book/e-cruiser`);
await page.waitForSelector("text=Dog gear (optional)");
await page.fill('input[type=date] >> nth=0', plus(5));
await page.fill('input[type=date] >> nth=1', plus(6));
await page.check("text=Dog trailer");
await page.fill("text=Dog weight (kg) >> input", "20");
await page.fill("text=Your name >> input", "Second");
await page.fill("text=Email >> input", "second@example.com");
await page.waitForTimeout(400);
await page.click("button:has-text('Book')");
await page.waitForSelector("code");
step(`4. after cancel, same trailer/dates → booked ${await page.locator("code").textContent()}`);

// R6.4 phone width
const phone = await browser.newPage({ viewport: { width: 375, height: 812 } });
await phone.goto(`${BASE}/book/cargo-long`);
await phone.waitForSelector("text=Dog gear (optional)");
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
step(`R6.4: 375px wide, horizontal overflow=${overflow}`);
await phone.screenshot({ path: `${OUT}/7-phone.png`, fullPage: true });

await browser.close();
const fs = await import("node:fs");
fs.writeFileSync(new URL("../docs/runs/acceptance-run.md", import.meta.url), `# Acceptance run (spec §8) — ${new Date().toISOString()}\n\nReal Chromium against \`pnpm start\`. Screenshots in \`acceptance/\`.\n\n${log.map((l) => `- ${l}`).join("\n")}\n`);
