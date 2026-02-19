import { parsePresentationBlocks, type PresentationLayoutConfig } from '@/lib/presentationLayout';

interface GeneratePresentationPdfArgs {
  title: string;
  content: string;
  layout: PresentationLayoutConfig;
  subtitle?: string;
}

function normalizePdfFont(fontFamily: unknown): 'helvetica' | 'times' | 'courier' {
  const raw = String(fontFamily ?? '').trim().toLowerCase();
  if (raw.includes('times') || raw.includes('serif') || raw.includes('georgia')) return 'times';
  if (raw.includes('mono') || raw.includes('courier') || raw.includes('consol')) return 'courier';
  return 'helvetica';
}

function toSafeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function hexToRgb(hex: unknown, fallback: [number, number, number] = [51, 65, 85]): [number, number, number] {
  const raw = String(hex ?? '').replace('#', '').trim();
  if (raw.length !== 6) return fallback;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return fallback;
  return [r, g, b];
}

type PdfImage = { dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP'; width: number; height: number };

function parseImageFormat(dataUrl: string): PdfImage['format'] | null {
  const head = dataUrl.slice(0, 40).toLowerCase();
  if (head.includes('data:image/png')) return 'PNG';
  if (head.includes('data:image/jpeg') || head.includes('data:image/jpg')) return 'JPEG';
  if (head.includes('data:image/webp')) return 'WEBP';
  return null;
}

async function loadImageDataUrl(url: string): Promise<PdfImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') return resolve(null);
        const format = parseImageFormat(result);
        if (!format) return resolve(null);
        const img = new Image();
        img.onload = () =>
          resolve({
            dataUrl: result,
            format,
            width: Math.max(1, img.naturalWidth || 1),
            height: Math.max(1, img.naturalHeight || 1),
          });
        img.onerror = () => resolve(null);
        img.src = result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generatePresentationPdf({ title, content, layout, subtitle }: GeneratePresentationPdfArgs) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const headerLineY = 86;
  const contentTop = 166;
  const contentBottom = pageHeight - 72;
  const contentWidth = pageWidth - marginX * 2;
  const font = normalizePdfFont(layout.font_family);
  const titleFontSize = toSafeNumber(layout.title_font_size, 22, 14, 40);
  const subtitleFontSize = toSafeNumber(layout.subtitle_font_size, 12, 10, 24);
  const bodyFontSize = toSafeNumber(layout.body_font_size, 11, 9, 18);
  const lineHeight = Math.max(16, bodyFontSize + 5);
  const safeTitle = String(title || 'Apresentação').trim() || 'Apresentação';
  const blocks = parsePresentationBlocks(content || '', layout.justify_all);
  const logoDataUrl = layout.logo_url ? await loadImageDataUrl(layout.logo_url) : null;
  const headerColor = hexToRgb(layout.header_line_color);
  const footerColor = hexToRgb(layout.footer_line_color);
  const titleColor = hexToRgb(layout.title_color, [15, 23, 42]);
  const subtitleColor = hexToRgb(layout.subtitle_color, [100, 116, 139]);
  const bodyColor = hexToRgb(layout.body_color, [0, 0, 0]);

  const drawHeaderFooter = () => {
    if (logoDataUrl) {
      let logoW = Math.min(Math.max(layout.logo_width || 120, 60), 240);
      let logoH = logoW / (logoDataUrl.width / logoDataUrl.height);
      if (logoH > 44) {
        const scale = 44 / logoH;
        logoH = 44;
        logoW *= scale;
      }
      const x =
        layout.logo_position === 'center'
          ? pageWidth / 2 - logoW / 2
          : layout.logo_position === 'right'
            ? pageWidth - marginX - logoW
            : marginX;
      doc.addImage(logoDataUrl.dataUrl, logoDataUrl.format, x, 24, logoW, logoH);
    }

    doc.setLineWidth(Math.min(4, Math.max(0.2, layout.header_line_width || 1.2)));
    doc.setDrawColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.line(marginX, headerLineY, pageWidth - marginX, headerLineY);

    if (subtitle) {
      doc.setFont(font, 'normal');
      doc.setFontSize(subtitleFontSize);
      doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
      const subtitleLines = doc.splitTextToSize(subtitle, contentWidth * 0.7);
      const subtitleLineHeight = Math.max(subtitleFontSize + 2, 14);
      const subtitleBottomY = headerLineY - 16;
      const subtitleStartY = subtitleBottomY - Math.max(0, subtitleLines.length - 1) * subtitleLineHeight;
      subtitleLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth - marginX, subtitleStartY + index * subtitleLineHeight, { align: 'right' });
      });
    }

    doc.setFont(font, 'bold');
    doc.setFontSize(titleFontSize);
    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.text(safeTitle, pageWidth / 2, 112, { align: 'center', maxWidth: contentWidth });

    doc.setLineWidth(Math.min(4, Math.max(0.2, layout.footer_line_width || 1)));
    doc.setDrawColor(footerColor[0], footerColor[1], footerColor[2]);
    doc.line(marginX, pageHeight - 48, pageWidth - marginX, pageHeight - 48);
    doc.setFont(font, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(layout.footer_text || 'Apresentação comercial', pageWidth / 2, pageHeight - 30, {
      align: 'center',
      maxWidth: contentWidth,
    });
  };

  const ensureSpace = (y: number, needed: number): number => {
    if (y + needed <= contentBottom) return y;
    doc.addPage();
    drawHeaderFooter();
    return contentTop;
  };

  drawHeaderFooter();
  let y = contentTop;

  doc.setFont(font, 'normal');
  doc.setFontSize(bodyFontSize);
  doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);

  for (const block of blocks) {
    if (block.type === 'spacer') {
      y = ensureSpace(y, 8);
      y += 6;
      continue;
    }
    if (block.type === 'title') {
      y = ensureSpace(y, 26);
      doc.setFont(font, 'bold');
      doc.setFontSize(Math.max(titleFontSize - 4, 14));
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      doc.text(doc.splitTextToSize(block.text, contentWidth), marginX, y);
      y += Math.max(lineHeight + 3, 18);
      continue;
    }
    if (block.type === 'subtitle') {
      y = ensureSpace(y, 22);
      doc.setFont(font, 'bold');
      doc.setFontSize(subtitleFontSize);
      doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
      doc.text(doc.splitTextToSize(block.text, contentWidth), marginX, y);
      y += Math.max(lineHeight + 2, 16);
      continue;
    }
    doc.setFont(font, 'normal');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
    const text = block.type === 'bullet' ? `• ${block.text}` : block.text;
    const lines = doc.splitTextToSize(text, contentWidth);
    y = ensureSpace(y, lines.length * lineHeight + 2);
    if (block.justified) {
      doc.text(text, marginX, y, { maxWidth: contentWidth, align: 'justify' });
    } else {
      doc.text(lines, marginX, y);
    }
    y += lines.length * lineHeight;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont(font, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - marginX, pageHeight - 14, { align: 'right' });
  }

  const safeFileTitle = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  doc.save(`apresentacao-${safeFileTitle || 'documento'}.pdf`);
}
