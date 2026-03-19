import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './helpers';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'v1.0.0';
const REPORT_AUTHOR_LABEL = 'Raporu olusturan: TEK Finans';
const REPORT_LOGO_URL = '/pwa-192x192.png';
let logoDataUrlPromise = null;

const formatDateLabel = () => {
  const now = new Date();
  return now.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const sanitizeFileDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}`;
};

const formatPercent = (value) => {
  const numeric = Number(value || 0);
  const prefix = numeric > 0 ? '+' : '';
  return `${prefix}${numeric.toFixed(2)}%`;
};

const loadLogoDataUrl = () => {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (logoDataUrlPromise) {
    return logoDataUrlPromise;
  }

  logoDataUrlPromise = new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = REPORT_LOGO_URL;
  });

  return logoDataUrlPromise;
};

export async function exportPortfolioReportPdf({
  baseCurrency,
  rates,
  summary,
  distribution,
  assets,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const generatedAt = formatDateLabel();
  const pageWidth = doc.internal.pageSize.width;
  const logoDataUrl = await loadLogoDataUrl();

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 40, 24, 22, 22);
  }

  doc.setFontSize(18);
  doc.text('TEK Finans - Portfoy Raporu', logoDataUrl ? 70 : 40, 46);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Olusturulma: ${generatedAt}`, 40, 64);
  doc.text(`Para Birimi: ${String(baseCurrency || 'TRY').toUpperCase()}`, 40, 78);
  doc.text(`Surum: ${APP_VERSION}`, pageWidth - 110, 46);

  const summaryRows = [
    ['Toplam Portfoy Degeri', formatCurrency(summary.totalValue, baseCurrency, rates)],
    ['Toplam Maliyet', formatCurrency(summary.totalCost, baseCurrency, rates)],
    ['Toplam Kar / Zarar', formatCurrency(summary.totalProfit, baseCurrency, rates)],
    ['Getiri Orani', formatPercent(summary.profitPercentage)],
  ];

  autoTable(doc, {
    startY: 92,
    head: [['Ozet', 'Deger']],
    body: summaryRows,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42] },
    theme: 'grid',
  });

  const distributionRows = Object.entries(distribution || {})
    .map(([institution, amount]) => ({
      institution,
      amount: Number(amount || 0),
    }))
    .filter((row) => Number.isFinite(row.amount) && row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((row) => [
      row.institution,
      formatCurrency(row.amount, baseCurrency, rates),
    ]);

  const distributionStartY = doc.lastAutoTable.finalY + 16;
  autoTable(doc, {
    startY: distributionStartY,
    head: [['Varlik Dagilimi (Kurum)', 'Tutar']],
    body: distributionRows.length ? distributionRows : [['Veri yok', '-']],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [16, 185, 129] },
    theme: 'grid',
  });

  const assetsRows = (assets || []).map((asset) => [
    asset.bank,
    asset.name,
    asset.symbol,
    asset.category,
    asset.amountLabel,
    formatCurrency(asset.avgPrice, baseCurrency, rates),
    formatCurrency(asset.currentPrice, baseCurrency, rates),
    formatCurrency(asset.totalValue, baseCurrency, rates),
    formatCurrency(asset.profit, baseCurrency, rates),
  ]);

  const assetsStartY = doc.lastAutoTable.finalY + 16;
  autoTable(doc, {
    startY: assetsStartY,
    head: [['Kurum', 'Varlik', 'Sembol', 'Kategori', 'Miktar', 'Ort. Maliyet', 'Guncel Fiyat', 'Deger', 'Kar/Zarar']],
    body: assetsRows.length ? assetsRows : [['-', '-', '-', '-', '-', '-', '-', '-', '-']],
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [8, 47, 73] },
    theme: 'grid',
    didDrawPage: () => {
      const footerPageWidth = doc.internal.pageSize.width;
      const footerPageHeight = doc.internal.pageSize.height;

      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text(`${REPORT_AUTHOR_LABEL} | Surum: ${APP_VERSION}`, 40, footerPageHeight - 30);
      doc.text('Bu rapor TEK Finans tarafindan otomatik olusturulmustur.', 40, footerPageHeight - 18);

      const signatureStartX = footerPageWidth - 200;
      const signatureLineY = footerPageHeight - 18;
      doc.text('Dijital Onay / Imza', signatureStartX, footerPageHeight - 30);
      doc.line(signatureStartX, signatureLineY, signatureStartX + 150, signatureLineY);

      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
      doc.text(`Sayfa ${pageNumber}`, footerPageWidth - 56, footerPageHeight - 8);
    },
  });

  const fileName = `tek-finans-rapor-${sanitizeFileDate()}.pdf`;
  doc.save(fileName);
}

export function exportPortfolioReportExcelCsv({
  baseCurrency,
  rates,
  summary,
  distribution,
  assets,
}) {
  const lines = [];
  lines.push(['TEK Finans Portfoy Raporu']);
  lines.push([`Olusturulma`, formatDateLabel()]);
  lines.push([`Para Birimi`, String(baseCurrency || 'TRY').toUpperCase()]);
  lines.push([]);

  lines.push(['Ozet']);
  lines.push(['Toplam Portfoy Degeri', formatCurrency(summary.totalValue, baseCurrency, rates)]);
  lines.push(['Toplam Maliyet', formatCurrency(summary.totalCost, baseCurrency, rates)]);
  lines.push(['Toplam Kar / Zarar', formatCurrency(summary.totalProfit, baseCurrency, rates)]);
  lines.push(['Getiri Orani', formatPercent(summary.profitPercentage)]);
  lines.push([]);

  lines.push(['Varlik Dagilimi']);
  lines.push(['Kurum', 'Tutar']);
  Object.entries(distribution || {})
    .map(([institution, amount]) => ({ institution, amount: Number(amount || 0) }))
    .filter((row) => Number.isFinite(row.amount) && row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .forEach((row) => {
      lines.push([row.institution, formatCurrency(row.amount, baseCurrency, rates)]);
    });

  lines.push([]);
  lines.push(['Varlik Listesi']);
  lines.push(['Kurum', 'Varlik', 'Sembol', 'Kategori', 'Miktar', 'Ort. Maliyet', 'Guncel Fiyat', 'Deger', 'Kar/Zarar']);

  (assets || []).forEach((asset) => {
    lines.push([
      asset.bank,
      asset.name,
      asset.symbol,
      asset.category,
      asset.amountLabel,
      formatCurrency(asset.avgPrice, baseCurrency, rates),
      formatCurrency(asset.currentPrice, baseCurrency, rates),
      formatCurrency(asset.totalValue, baseCurrency, rates),
      formatCurrency(asset.profit, baseCurrency, rates),
    ]);
  });

  const csv = lines
    .map((row) => row
      .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
      .join(';'))
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tek-finans-rapor-${sanitizeFileDate()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
