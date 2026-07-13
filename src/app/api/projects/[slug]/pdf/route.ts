import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import { getSession } from "@/lib/auth";
import { getProjectMonthReport } from "@/lib/project-report";
import {
  buildSlideHtml,
  REPORT_SLIDE_COUNT,
} from "@/lib/report-pdf";

const PDF_OPTIONS = {
  format: "A4" as const,
  landscape: true,
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { slug } = await params;
  const monthId = Number(request.nextUrl.searchParams.get("monthId"));
  if (!Number.isFinite(monthId)) {
    return NextResponse.json({ error: "請指定月份" }, { status: 400 });
  }

  const { project, month, report, forbidden } = await getProjectMonthReport(
    slug,
    monthId,
    session
  );

  if (!project || !month) {
    return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  }
  if (forbidden) {
    return NextResponse.json(
      { error: "此月份尚未開放 Views 權限" },
      { status: 403 }
    );
  }
  if (!report) {
    return NextResponse.json({ error: "報告不存在" }, { status: 404 });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.emulateMedia({ media: "print" });

    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < REPORT_SLIDE_COUNT; i++) {
      await page.setContent(buildSlideHtml(report, i), {
        waitUntil: "load",
      });

      const slidePdf = await page.pdf(PDF_OPTIONS);
      const slideDoc = await PDFDocument.load(slidePdf);
      const copiedPages = await mergedPdf.copyPages(
        slideDoc,
        slideDoc.getPageIndices()
      );
      copiedPages.forEach((copiedPage) => mergedPdf.addPage(copiedPage));
    }

    await browser.close();

    const pdf = await mergedPdf.save();

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          `${project.name}-${month.report_month}-report.pdf`
        )}"`,
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error("PDF export error:", error);
    return NextResponse.json(
      { error: "PDF 匯出失敗，請確認瀏覽器引擎已安裝" },
      { status: 500 }
    );
  }
}
