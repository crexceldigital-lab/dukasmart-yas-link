import { jsPDF } from "jspdf";
import type { Merchant, Product } from "./store";
import { formatTZS } from "./utils";

export async function generateCatalogue(merchant: Merchant, products: Product[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  doc.setFillColor(18, 50, 116);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(merchant.businessName, margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${merchant.dukaId}  •  ${merchant.city}`, margin, 62);
  doc.setFontSize(9);
  doc.text("POKEA — Katalogi ya Bidhaa", margin, 78);

  let y = 120;
  const cardW = (pageW - margin * 2 - 16) / 2;
  const cardH = 200;
  let col = 0;

  for (const p of products) {
    if (y + cardH > pageH - 40) {
      doc.addPage();
      y = 60; col = 0;
    }
    const x = margin + col * (cardW + 16);
    doc.setDrawColor(228, 232, 239);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardW, cardH, 10, 10, "FD");

    if (p.photoUrl && p.photoUrl.startsWith("data:image/")) {
      try {
        const fmt = p.photoUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(p.photoUrl, fmt, x + 10, y + 10, cardW - 20, 110, undefined, "FAST");
      } catch { /* skip image */ }
    } else {
      doc.setFillColor(240, 244, 248);
      doc.roundedRect(x + 10, y + 10, cardW - 20, 110, 8, 8, "F");
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const name = doc.splitTextToSize(p.name, cardW - 20);
    doc.text(name.slice(0, 2), x + 10, y + 138);

    doc.setTextColor(0, 168, 107);
    doc.setFontSize(14);
    doc.text(formatTZS(p.priceTzs), x + 10, y + 180);

    col++;
    if (col >= 2) { col = 0; y += cardH + 16; }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("Powered by POKEA × Mixx by Yas", margin, pageH - 20);
    doc.text(`${i} / ${pages}`, pageW - margin, pageH - 20, { align: "right" });
  }

  const safeName = merchant.businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "duka";
  doc.save(`${safeName}-katalogi.pdf`);
}