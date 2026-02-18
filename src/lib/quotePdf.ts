import type { Contact, ProductItem, QuoteItem, QuoteModel } from '@/lib/types';
import {
  buildQuoteTemplateData,
  currencyToWordsPtBr,
  extractDynamicParams,
  formatCurrency,
  getLayoutOverrides,
  getModelLayoutConfig,
  getPaymentTerms,
  getQuoteItems,
  mergeLayout,
  parseTemplateBlocks,
  renderTemplate,
} from '@/lib/quoteLayout';

interface GenerateQuotePdfArgs {
  quote: QuoteItem;
  contact?: Contact;
  product?: ProductItem;
  model?: QuoteModel;
}

function toSafeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizePdfFont(fontFamily: unknown): 'helvetica' | 'times' | 'courier' {
  const raw = String(fontFamily ?? '')
    .trim()
    .toLowerCase();
  if (raw.includes('times') || raw.includes('serif') || raw.includes('georgia')) return 'times';
  if (raw.includes('mono') || raw.includes('courier') || raw.includes('consol')) return 'courier';
  return 'helvetica';
}

function hexToRgb(hex: unknown, fallback: [number, number, number] = [30, 41, 59]): [number, number, number] {
  const raw = String(hex ?? '')
    .replace('#', '')
    .trim();
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
        if (typeof result !== 'string') {
          resolve(null);
          return;
        }
        const format = parseImageFormat(result);
        if (!format) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const width = Number.isFinite(img.naturalWidth) && img.naturalWidth > 0 ? img.naturalWidth : 1;
          const height = Number.isFinite(img.naturalHeight) && img.naturalHeight > 0 ? img.naturalHeight : 1;
          resolve({ dataUrl: result, format, width, height });
        };
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

export async function generateQuotePdf({ quote, contact, product, model }: GenerateQuotePdfArgs) {
  const { jsPDF } = await import('jspdf');
  const params = (quote.parameters as Record<string, unknown> | null) ?? null;
  const dynamicParams = extractDynamicParams(params);
  const paymentTerms = getPaymentTerms(params);
  const items = getQuoteItems(params);
  const layout = mergeLayout(getModelLayoutConfig(model ?? null), getLayoutOverrides(params));

  const date = new Date(quote.created_at).toLocaleDateString('pt-BR');
  const templateData = buildQuoteTemplateData({ quote, contact, product, params: dynamicParams, date, paymentTerms });
  const bodyRaw = model ? renderTemplate(model.template_content, templateData) : quote.generated_content ?? '';
  const bodyBlocks = parseTemplateBlocks(bodyRaw);

  const safeTitle = String(quote.title ?? '').trim() || 'Orçamento';
  const primary = hexToRgb(layout.primary_color, [249, 115, 22]);
  const titleColor = hexToRgb(layout.title_color, primary);
  const subtitleColor = hexToRgb(layout.subtitle_color, [51, 65, 85]);
  const bodyColor = hexToRgb(layout.body_color, [0, 0, 0]);
  const headerLineColor = hexToRgb(layout.header_line_color, [51, 65, 85]);
  const footerLineColor = hexToRgb(layout.footer_line_color, [51, 65, 85]);
  const tableLineColor = hexToRgb(layout.table_line_color, [148, 163, 184]);
  const font = normalizePdfFont(layout.font_family);
  const titleFontSize = toSafeNumber(layout.title_font_size, 22, 10, 56);
  const subtitleFontSize = toSafeNumber(layout.subtitle_font_size, 14, 9, 36);
  const bodyFontSize = toSafeNumber(layout.body_font_size, 11, 8, 24);
  const headerLineWidth = toSafeNumber(layout.header_line_width, 1.2, 0.2, 4);
  const footerLineWidth = toSafeNumber(layout.footer_line_width, 1, 0.2, 4);
  const tableLineWidth = toSafeNumber(layout.table_line_width, 0.8, 0.2, 4);

  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const headerLineY = 82; // ~5.6mm acima da posicao anterior para afastar do titulo
  const headerDateY = Math.max(24, headerLineY - 10);
  const contentTop = 132;
  const contentBottom = pageHeight - 76;
  const contentWidth = pageWidth - marginX * 2;
  const lineHeight = Math.max(16, bodyFontSize + 5);
  const logoDataUrl = layout.logo_url ? await loadImageDataUrl(layout.logo_url) : null;
  const safeLogoWidth = toSafeNumber(layout.logo_width, 120, 48, 320);

  const applyBody = () => {
    doc.setFont(font, 'normal');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
  };

  const drawHeaderFooter = () => {
    if (layout.show_watermark) {
      try {
        doc.saveGraphicsState();
        doc.setTextColor(228, 228, 231);
        doc.setFont(font, 'bold');
        doc.setFontSize(78);
        // Evita erro de scale em algumas combinacoes de engine/font com texto rotacionado.
        doc.text(layout.watermark_text || 'ORÇAMENTO', pageWidth / 2, pageHeight / 2, { align: 'center' });
        doc.restoreGraphicsState();
      } catch {
        // Se a marca d'agua falhar, segue sem ela para nao bloquear o PDF.
      }
    }

    if (logoDataUrl) {
      try {
        const maxLogoWidth = safeLogoWidth;
        const maxLogoHeight = 44;
        const imageRatio = logoDataUrl.width / logoDataUrl.height;
        let logoW = maxLogoWidth;
        let logoH = logoW / imageRatio;
        if (!Number.isFinite(logoH) || logoH <= 0) {
          logoH = 32;
        }
        if (logoH > maxLogoHeight) {
          const scale = maxLogoHeight / logoH;
          logoH = maxLogoHeight;
          logoW = logoW * scale;
        }
        const x =
          layout.logo_position === 'center'
            ? pageWidth / 2 - logoW / 2
            : layout.logo_position === 'right'
              ? pageWidth - marginX - logoW
              : marginX;
        if (Number.isFinite(logoW) && Number.isFinite(logoH) && Number.isFinite(x) && logoW > 0 && logoH > 0) {
          doc.addImage(logoDataUrl.dataUrl, logoDataUrl.format, x, 22, logoW, logoH);
        }
      } catch {
        // Se o logo for invalido/incompativel, segue sem logo para nao travar.
      }
    }

    doc.setLineWidth(headerLineWidth);
    doc.setDrawColor(headerLineColor[0], headerLineColor[1], headerLineColor[2]);
    doc.line(marginX, headerLineY, pageWidth - marginX, headerLineY);

    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.setFont(font, 'bold');
    doc.setFontSize(titleFontSize);
    doc.text(safeTitle, pageWidth / 2, 112, { align: 'center', maxWidth: contentWidth });

    const dateText = `Data: ${date}`;
    doc.setTextColor(71, 85, 105);
    doc.setFont(font, 'bold');
    doc.setFontSize(10);
    if (layout.date_position === 'header-left') doc.text(dateText, marginX, headerDateY);
    if (layout.date_position === 'header-right') doc.text(dateText, pageWidth - marginX, headerDateY, { align: 'right' });

    doc.setLineWidth(footerLineWidth);
    doc.setDrawColor(footerLineColor[0], footerLineColor[1], footerLineColor[2]);
    doc.line(marginX, pageHeight - 48, pageWidth - marginX, pageHeight - 48);

    doc.setFont(font, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    if (layout.footer_text) doc.text(layout.footer_text, pageWidth / 2, pageHeight - 30, { align: 'center', maxWidth: contentWidth });
    if (layout.date_position === 'footer-left') doc.text(dateText, marginX, pageHeight - 30);
    if (layout.date_position === 'footer-right') doc.text(dateText, pageWidth - marginX, pageHeight - 30, { align: 'right' });
  };

  const addPage = () => {
    drawHeaderFooter();
    applyBody();
  };

  const ensureSpace = (y: number, needed: number): number => {
    if (y + needed <= contentBottom) return y;
    doc.addPage();
    addPage();
    return contentTop;
  };

  try {
    addPage();
    let y = contentTop;

    const fieldsMap: Record<string, string> = {
    cliente: String(templateData.cliente ?? '-'),
    empresa: String(templateData.empresa ?? '-'),
    telefone: String(templateData.telefone ?? '-'),
    email: String(templateData.email ?? '-'),
    whatsapp: String(templateData.whatsapp ?? '-'),
    produto: String(templateData.produto ?? '-'),
    valor: typeof quote.total_value === 'number' ? formatCurrency(quote.total_value) : '-',
    valor_extenso: String(templateData.valor_extenso ?? '-'),
    forma_pagamento: String(templateData.forma_pagamento ?? '-'),
    data: date,
    status: quote.status,
  };

    const labelsMap: Record<string, string> = {
    cliente: 'Cliente',
    empresa: 'Empresa',
    telefone: 'Telefone',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    produto: 'Produto',
    valor: 'Valor',
    valor_extenso: 'Valor por extenso',
    forma_pagamento: 'Forma de pagamento',
    data: 'Data',
    status: 'Status',
  };

    if (layout.show_summary) {
      y = ensureSpace(y, 26);
      doc.setFont(font, 'bold');
      doc.setFontSize(subtitleFontSize);
      doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
      doc.text('Resumo do orçamento', marginX, y);
      y += 18;
      applyBody();
      for (const key of layout.visible_fields) {
        const wrapped = doc.splitTextToSize(`${labelsMap[key]}: ${fieldsMap[key] || '-'}`, contentWidth);
        y = ensureSpace(y, wrapped.length * lineHeight + 2);
        doc.text(wrapped, marginX, y);
        y += wrapped.length * lineHeight;
      }
    }

    y += 8;
    y = ensureSpace(y, 26);
    doc.setFont(font, 'bold');
    doc.setFontSize(layout.subtitle_font_size);
    doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
    doc.text('Descrição da proposta', marginX, y);
    y += 18;

    for (const block of bodyBlocks) {
    if (block.type === 'spacer') {
      y = ensureSpace(y, 10);
      y += 8;
      continue;
    }

    if (block.type === 'title') {
      y = ensureSpace(y, titleFontSize + 8);
      doc.setFont(font, 'bold');
      doc.setFontSize(Math.max(subtitleFontSize + 1, titleFontSize - 4));
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      const lines = doc.splitTextToSize(block.text, contentWidth);
      doc.text(lines, marginX, y);
      y += lines.length * (titleFontSize - 1);
      continue;
    }

    if (block.type === 'subtitle') {
      y = ensureSpace(y, subtitleFontSize + 6);
      doc.setFont(font, 'bold');
      doc.setFontSize(subtitleFontSize);
      doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
      const lines = doc.splitTextToSize(block.text, contentWidth);
      doc.text(lines, marginX, y);
      y += lines.length * (subtitleFontSize + 2);
      continue;
    }

    applyBody();
    const text = block.type === 'bullet' ? `• ${block.text}` : block.text;
    const lines = doc.splitTextToSize(text, contentWidth);
    y = ensureSpace(y, lines.length * lineHeight + 2);
    doc.text(lines, marginX, y);
    y += lines.length * lineHeight;
    }

    const additionalParams = Object.entries(dynamicParams).filter(
    ([key]) =>
      ![
        'cliente',
        'empresa',
        'telefone',
        'email',
        'whatsapp',
        'produto',
        'valor',
        'valor_extenso',
        'forma_pagamento',
        'data',
        'status',
        'payment_terms',
        'quote_items',
      ].includes(key),
  );

    if (items.length) {
      y += 6;
      y = ensureSpace(y, 28);
      doc.setFont(font, 'bold');
      doc.setFontSize(subtitleFontSize);
      doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
      doc.text('Itens do orçamento', marginX, y);
      y += 16;

      applyBody();
      doc.setFont(font, 'bold');
      y = ensureSpace(y, 18);
      doc.text('Descrição', marginX, y);
      doc.text('Qtd', marginX + contentWidth - 190, y, { align: 'right' });
      doc.text('Unitário', marginX + contentWidth - 95, y, { align: 'right' });
      doc.text('Total', marginX + contentWidth, y, { align: 'right' });
      y += 16;

      doc.setFont(font, 'normal');
      for (const item of items) {
        const total = item.quantity * item.unit_price;
        const descriptionLines = doc.splitTextToSize(item.description, contentWidth - 220);
        const needed = Math.max(descriptionLines.length * lineHeight, lineHeight);
        y = ensureSpace(y, needed + 8);
        doc.text(descriptionLines, marginX, y);
        doc.text(String(item.quantity), marginX + contentWidth - 190, y, { align: 'right' });
        doc.text(formatCurrency(item.unit_price), marginX + contentWidth - 95, y, { align: 'right' });
        doc.text(formatCurrency(total), marginX + contentWidth, y, { align: 'right' });
        y += needed + 6;
      }

      const tableTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      y = ensureSpace(y, lineHeight * 2 + 20);
      doc.setLineWidth(tableLineWidth);
      doc.setDrawColor(tableLineColor[0], tableLineColor[1], tableLineColor[2]);
      doc.line(marginX, y, marginX + contentWidth, y);
      y += 14;
      applyBody();
      doc.setFont(font, 'bold');
      doc.text(`Total dos itens: ${formatCurrency(tableTotal)}`, marginX + contentWidth, y, { align: 'right' });
      y += lineHeight;
      doc.setFont(font, 'normal');
      doc.text(`(${currencyToWordsPtBr(tableTotal)})`, marginX + contentWidth, y, { align: 'right' });
      y += 8;
      doc.setLineWidth(tableLineWidth);
      doc.setDrawColor(tableLineColor[0], tableLineColor[1], tableLineColor[2]);
      doc.line(marginX, y, marginX + contentWidth, y);
    }

    const commercialConditions = [
    typeof dynamicParams.prazo_dias === 'number' ? `Prazo: ${dynamicParams.prazo_dias} dias` : null,
    typeof dynamicParams.validade_proposta === 'string' ? `Validade da proposta: ${dynamicParams.validade_proposta}` : null,
    paymentTerms ? `Pagamento: ${paymentTerms}` : null,
  ].filter((x): x is string => Boolean(x));

    if (layout.show_commercial_terms && commercialConditions.length) {
    y += 18;
    y = ensureSpace(y, 24);
    doc.setFont(font, 'bold');
    doc.setFontSize(subtitleFontSize);
    doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
    doc.text('Condições comerciais', marginX, y);
    y += 16;
    applyBody();
    for (const line of commercialConditions) {
      const lines = doc.splitTextToSize(`• ${line}`, contentWidth);
      y = ensureSpace(y, lines.length * lineHeight + 2);
      doc.text(lines, marginX, y);
      y += lines.length * lineHeight;
    }
    }

    if (layout.show_additional_info && additionalParams.length) {
      y += 10;
      y = ensureSpace(y, 24);
      doc.setFont(font, 'bold');
      doc.setFontSize(subtitleFontSize);
      doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
      doc.text('Informações adicionais', marginX, y);
      y += 16;
      applyBody();
      for (const [key, value] of additionalParams) {
        const lines = doc.splitTextToSize(`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`, contentWidth);
        y = ensureSpace(y, lines.length * lineHeight + 2);
        doc.text(lines, marginX, y);
        y += lines.length * lineHeight;
      }
    }

    if (layout.show_signature) {
      y += 24;
      y = ensureSpace(y, 40);
      const signX = pageWidth - marginX - 220;
      doc.setDrawColor(148, 163, 184);
      doc.line(signX, y, signX + 220, y);
      y += 14;
      applyBody();
      doc.setFont(font, 'bold');
      doc.text(layout.signature_name || 'Assinatura', signX + 110, y, { align: 'center' });
      y += 12;
      doc.setFont(font, 'normal');
      doc.setFontSize(10);
      doc.text(layout.signature_role || '', signX + 110, y, { align: 'center' });
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
    doc.save(`orcamento-${safeFileTitle || 'documento'}.pdf`);
  } catch {
    const fallback = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const text = [
      `Orçamento: ${safeTitle}`,
      `Data: ${date}`,
      '',
      `Cliente: ${String(templateData.cliente ?? '-')}`,
      `Produto: ${String(templateData.produto ?? '-')}`,
      `Valor: ${String(templateData.valor ?? '-')}`,
      `Valor por extenso: ${String(templateData.valor_extenso ?? '-')}`,
      `Forma de pagamento: ${String(templateData.forma_pagamento ?? '-')}`,
      '',
      'Descrição:',
      ...(String(bodyRaw || 'Sem conteudo de modelo.').split(/\r?\n/)),
    ];
    let y = 48;
    fallback.setFont('helvetica', 'normal');
    fallback.setFontSize(11);
    text.forEach((line) => {
      const lines = fallback.splitTextToSize(line, 500);
      if (y > 790) {
        fallback.addPage();
        y = 48;
      }
      fallback.text(lines, 48, y);
      y += lines.length * 16;
    });
    const safeFileTitle = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    fallback.save(`orcamento-${safeFileTitle || 'documento'}-fallback.pdf`);
  }
}
