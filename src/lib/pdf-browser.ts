import type { Browser, Page } from "puppeteer-core";

export async function launchPdfBrowser(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  const chromium = (await import("@sparticuz/chromium")).default;

  // Smaller footprint on serverless; PDF export does not need WebGL.
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
    executablePath: await chromium.executablePath(),
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
  return new Uint8Array(pdf);
}
