import type { Browser, Page } from "puppeteer-core";

/**
 * Remote chromium pack for @sparticuz/chromium-min.
 * Keeps the Vercel deploy under size limits; binary is downloaded at runtime to /tmp.
 */
const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

export async function launchPdfBrowser(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  const chromium = (await import("@sparticuz/chromium-min")).default;

  // Smaller footprint; PDF export does not need WebGL.
  chromium.setGraphicsMode = false;

  return puppeteer.launch({
    args: await puppeteer.defaultArgs({
      args: chromium.args,
      headless: "shell",
    }),
    defaultViewport: {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
    },
    executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
    headless: "shell",
  });
}

export async function renderHtmlToPdf(
  page: Page,
  html: string,
  options: {
    format: "A4";
    landscape: boolean;
    printBackground: boolean;
    margin: { top: string; right: string; bottom: string; left: string };
  }
): Promise<Uint8Array> {
  await page.setContent(html, {
    waitUntil: ["load", "domcontentloaded"],
  });
  await page.emulateMediaType("print");
  const pdf = await page.pdf(options);
  return pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf);
}
