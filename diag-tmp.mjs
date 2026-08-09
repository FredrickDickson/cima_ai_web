import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => console.log("[console]", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));

await page.goto("http://localhost:5173/login", { waitUntil: "networkidle", timeout: 20000 }).catch((e) => console.log("[goto error]", e.message));
await page.waitForTimeout(3000);
console.log("TITLE:", await page.title());
console.log("BODY TEXT:", (await page.locator("body").innerText()).slice(0, 500));
await browser.close();
