import type { Contact, ProductItem, QuoteItem, QuoteModel } from '@/lib/types';

export type QuoteFieldKey =
  | 'cliente'
  | 'empresa'
  | 'telefone'
  | 'email'
  | 'whatsapp'
  | 'produto'
  | 'valor'
  | 'valor_extenso'
  | 'forma_pagamento'
  | 'data'
  | 'status';

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface QuoteLayoutConfig {
  logo_url: string;
  logo_position: 'left' | 'center' | 'right';
  logo_width: number;
  footer_text: string;
  watermark_text: string;
  show_watermark: boolean;
  show_signature: boolean;
  signature_name: string;
  signature_role: string;
  font_family: 'helvetica' | 'times' | 'courier';
  body_font_size: number;
  title_font_size: number;
  subtitle_font_size: number;
  date_position: 'header-left' | 'header-right' | 'footer-left' | 'footer-right';
  primary_color: string;
  title_color: string;
  subtitle_color: string;
  body_color: string;
  header_line_color: string;
  footer_line_color: string;
  table_line_color: string;
  header_line_width: number;
  footer_line_width: number;
  table_line_width: number;
  show_summary: boolean;
  show_additional_info: boolean;
  show_recipient: boolean;
  recipient_template: string;
  justify_all: boolean;
  show_commercial_terms: boolean;
  visible_fields: QuoteFieldKey[];
}

export const QUOTE_FIELD_OPTIONS: Array<{ key: QuoteFieldKey; label: string }> = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'email', label: 'E-mail' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'produto', label: 'Produto' },
  { key: 'valor', label: 'Valor' },
  { key: 'valor_extenso', label: 'Valor por extenso' },
  { key: 'forma_pagamento', label: 'Forma de pagamento' },
  { key: 'data', label: 'Data' },
  { key: 'status', label: 'Status' },
];

export const DEFAULT_QUOTE_LAYOUT: QuoteLayoutConfig = {
  logo_url: '',
  logo_position: 'left',
  logo_width: 120,
  footer_text: 'Documento gerado pelo Comercial OS.',
  watermark_text: 'ORÇAMENTO',
  show_watermark: false,
  show_signature: false,
  signature_name: '',
  signature_role: '',
  font_family: 'helvetica',
  body_font_size: 11,
  title_font_size: 22,
  subtitle_font_size: 14,
  date_position: 'header-right',
  primary_color: '#f97316',
  title_color: '#f97316',
  subtitle_color: '#334155',
  body_color: '#000000',
  header_line_color: '#334155',
  footer_line_color: '#334155',
  table_line_color: '#94a3b8',
  header_line_width: 1.2,
  footer_line_width: 1,
  table_line_width: 0.8,
  show_summary: true,
  show_additional_info: true,
  show_recipient: true,
  recipient_template: 'Contato: {{cliente}}\nEmpresa: {{empresa}}',
  justify_all: false,
  show_commercial_terms: true,
  visible_fields: ['cliente', 'empresa', 'produto', 'valor', 'valor_extenso', 'forma_pagamento', 'data', 'status'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeVisibleFields(value: unknown): QuoteFieldKey[] {
  if (!Array.isArray(value)) return DEFAULT_QUOTE_LAYOUT.visible_fields;
  const allowed = new Set<QuoteFieldKey>(QUOTE_FIELD_OPTIONS.map((x) => x.key));
  const filtered = value.filter(
    (item): item is QuoteFieldKey => typeof item === 'string' && allowed.has(item as QuoteFieldKey),
  );
  return filtered.length ? filtered : DEFAULT_QUOTE_LAYOUT.visible_fields;
}

export function getModelLayoutConfig(model: QuoteModel | null): QuoteLayoutConfig {
  const raw = isRecord(model?.parameters) ? model.parameters.layout : null;
  const layout = isRecord(raw) ? raw : {};

  return {
    logo_url: typeof layout.logo_url === 'string' ? layout.logo_url : DEFAULT_QUOTE_LAYOUT.logo_url,
    logo_position:
      layout.logo_position === 'center' || layout.logo_position === 'right'
        ? layout.logo_position
        : DEFAULT_QUOTE_LAYOUT.logo_position,
    logo_width:
      typeof layout.logo_width === 'number' && Number.isFinite(layout.logo_width)
        ? Math.min(240, Math.max(60, layout.logo_width))
        : DEFAULT_QUOTE_LAYOUT.logo_width,
    footer_text: typeof layout.footer_text === 'string' ? layout.footer_text : DEFAULT_QUOTE_LAYOUT.footer_text,
    watermark_text:
      typeof layout.watermark_text === 'string' ? layout.watermark_text : DEFAULT_QUOTE_LAYOUT.watermark_text,
    show_watermark:
      typeof layout.show_watermark === 'boolean' ? layout.show_watermark : DEFAULT_QUOTE_LAYOUT.show_watermark,
    show_signature:
      typeof layout.show_signature === 'boolean' ? layout.show_signature : DEFAULT_QUOTE_LAYOUT.show_signature,
    signature_name:
      typeof layout.signature_name === 'string' ? layout.signature_name : DEFAULT_QUOTE_LAYOUT.signature_name,
    signature_role:
      typeof layout.signature_role === 'string' ? layout.signature_role : DEFAULT_QUOTE_LAYOUT.signature_role,
    font_family:
      layout.font_family === 'times' || layout.font_family === 'courier'
        ? layout.font_family
        : DEFAULT_QUOTE_LAYOUT.font_family,
    body_font_size:
      typeof layout.body_font_size === 'number' && Number.isFinite(layout.body_font_size)
        ? Math.min(16, Math.max(9, layout.body_font_size))
        : DEFAULT_QUOTE_LAYOUT.body_font_size,
    title_font_size:
      typeof layout.title_font_size === 'number' && Number.isFinite(layout.title_font_size)
        ? Math.min(40, Math.max(14, layout.title_font_size))
        : DEFAULT_QUOTE_LAYOUT.title_font_size,
    subtitle_font_size:
      typeof layout.subtitle_font_size === 'number' && Number.isFinite(layout.subtitle_font_size)
        ? Math.min(30, Math.max(11, layout.subtitle_font_size))
        : DEFAULT_QUOTE_LAYOUT.subtitle_font_size,
    date_position:
      layout.date_position === 'header-left' ||
      layout.date_position === 'header-right' ||
      layout.date_position === 'footer-left' ||
      layout.date_position === 'footer-right'
        ? layout.date_position
        : DEFAULT_QUOTE_LAYOUT.date_position,
    primary_color:
      typeof layout.primary_color === 'string' ? layout.primary_color : DEFAULT_QUOTE_LAYOUT.primary_color,
    title_color: typeof layout.title_color === 'string' ? layout.title_color : DEFAULT_QUOTE_LAYOUT.title_color,
    subtitle_color:
      typeof layout.subtitle_color === 'string' ? layout.subtitle_color : DEFAULT_QUOTE_LAYOUT.subtitle_color,
    body_color: typeof layout.body_color === 'string' ? layout.body_color : DEFAULT_QUOTE_LAYOUT.body_color,
    header_line_color:
      typeof layout.header_line_color === 'string' ? layout.header_line_color : DEFAULT_QUOTE_LAYOUT.header_line_color,
    footer_line_color:
      typeof layout.footer_line_color === 'string' ? layout.footer_line_color : DEFAULT_QUOTE_LAYOUT.footer_line_color,
    table_line_color:
      typeof layout.table_line_color === 'string' ? layout.table_line_color : DEFAULT_QUOTE_LAYOUT.table_line_color,
    header_line_width:
      typeof layout.header_line_width === 'number' && Number.isFinite(layout.header_line_width)
        ? Math.min(4, Math.max(0.2, layout.header_line_width))
        : DEFAULT_QUOTE_LAYOUT.header_line_width,
    footer_line_width:
      typeof layout.footer_line_width === 'number' && Number.isFinite(layout.footer_line_width)
        ? Math.min(4, Math.max(0.2, layout.footer_line_width))
        : DEFAULT_QUOTE_LAYOUT.footer_line_width,
    table_line_width:
      typeof layout.table_line_width === 'number' && Number.isFinite(layout.table_line_width)
        ? Math.min(4, Math.max(0.2, layout.table_line_width))
        : DEFAULT_QUOTE_LAYOUT.table_line_width,
    show_summary: typeof layout.show_summary === 'boolean' ? layout.show_summary : DEFAULT_QUOTE_LAYOUT.show_summary,
    show_additional_info:
      typeof layout.show_additional_info === 'boolean'
        ? layout.show_additional_info
        : DEFAULT_QUOTE_LAYOUT.show_additional_info,
    show_recipient:
      typeof layout.show_recipient === 'boolean' ? layout.show_recipient : DEFAULT_QUOTE_LAYOUT.show_recipient,
    recipient_template:
      typeof layout.recipient_template === 'string'
        ? layout.recipient_template
        : DEFAULT_QUOTE_LAYOUT.recipient_template,
    justify_all: typeof layout.justify_all === 'boolean' ? layout.justify_all : DEFAULT_QUOTE_LAYOUT.justify_all,
    show_commercial_terms:
      typeof layout.show_commercial_terms === 'boolean'
        ? layout.show_commercial_terms
        : DEFAULT_QUOTE_LAYOUT.show_commercial_terms,
    visible_fields: normalizeVisibleFields(layout.visible_fields),
  };
}

export function getModelDefaults(model: QuoteModel | null): Record<string, unknown> {
  if (!isRecord(model?.parameters)) return {};
  const defaults = model.parameters.defaults;
  return isRecord(defaults) ? defaults : {};
}

export function getLayoutOverrides(params: Record<string, unknown> | null): Partial<QuoteLayoutConfig> {
  if (!isRecord(params)) return {};
  const raw = params.layout_overrides;
  if (!isRecord(raw)) return {};

  return {
    logo_url: typeof raw.logo_url === 'string' ? raw.logo_url : undefined,
    logo_position:
      raw.logo_position === 'left' || raw.logo_position === 'center' || raw.logo_position === 'right'
        ? raw.logo_position
        : undefined,
    logo_width:
      typeof raw.logo_width === 'number' && Number.isFinite(raw.logo_width)
        ? Math.min(240, Math.max(60, raw.logo_width))
        : undefined,
    footer_text: typeof raw.footer_text === 'string' ? raw.footer_text : undefined,
    watermark_text: typeof raw.watermark_text === 'string' ? raw.watermark_text : undefined,
    show_watermark: typeof raw.show_watermark === 'boolean' ? raw.show_watermark : undefined,
    show_signature: typeof raw.show_signature === 'boolean' ? raw.show_signature : undefined,
    signature_name: typeof raw.signature_name === 'string' ? raw.signature_name : undefined,
    signature_role: typeof raw.signature_role === 'string' ? raw.signature_role : undefined,
    font_family:
      raw.font_family === 'helvetica' || raw.font_family === 'times' || raw.font_family === 'courier'
        ? raw.font_family
        : undefined,
    body_font_size:
      typeof raw.body_font_size === 'number' && Number.isFinite(raw.body_font_size)
        ? Math.min(16, Math.max(9, raw.body_font_size))
        : undefined,
    title_font_size:
      typeof raw.title_font_size === 'number' && Number.isFinite(raw.title_font_size)
        ? Math.min(40, Math.max(14, raw.title_font_size))
        : undefined,
    subtitle_font_size:
      typeof raw.subtitle_font_size === 'number' && Number.isFinite(raw.subtitle_font_size)
        ? Math.min(30, Math.max(11, raw.subtitle_font_size))
        : undefined,
    date_position:
      raw.date_position === 'header-left' ||
      raw.date_position === 'header-right' ||
      raw.date_position === 'footer-left' ||
      raw.date_position === 'footer-right'
        ? raw.date_position
        : undefined,
    primary_color: typeof raw.primary_color === 'string' ? raw.primary_color : undefined,
    title_color: typeof raw.title_color === 'string' ? raw.title_color : undefined,
    subtitle_color: typeof raw.subtitle_color === 'string' ? raw.subtitle_color : undefined,
    body_color: typeof raw.body_color === 'string' ? raw.body_color : undefined,
    header_line_color: typeof raw.header_line_color === 'string' ? raw.header_line_color : undefined,
    footer_line_color: typeof raw.footer_line_color === 'string' ? raw.footer_line_color : undefined,
    table_line_color: typeof raw.table_line_color === 'string' ? raw.table_line_color : undefined,
    header_line_width:
      typeof raw.header_line_width === 'number' && Number.isFinite(raw.header_line_width)
        ? Math.min(4, Math.max(0.2, raw.header_line_width))
        : undefined,
    footer_line_width:
      typeof raw.footer_line_width === 'number' && Number.isFinite(raw.footer_line_width)
        ? Math.min(4, Math.max(0.2, raw.footer_line_width))
        : undefined,
    table_line_width:
      typeof raw.table_line_width === 'number' && Number.isFinite(raw.table_line_width)
        ? Math.min(4, Math.max(0.2, raw.table_line_width))
        : undefined,
    show_summary: typeof raw.show_summary === 'boolean' ? raw.show_summary : undefined,
    show_additional_info:
      typeof raw.show_additional_info === 'boolean' ? raw.show_additional_info : undefined,
    show_recipient: typeof raw.show_recipient === 'boolean' ? raw.show_recipient : undefined,
    recipient_template: typeof raw.recipient_template === 'string' ? raw.recipient_template : undefined,
    justify_all: typeof raw.justify_all === 'boolean' ? raw.justify_all : undefined,
    show_commercial_terms:
      typeof raw.show_commercial_terms === 'boolean' ? raw.show_commercial_terms : undefined,
    visible_fields: normalizeVisibleFields(raw.visible_fields),
  };
}

export function mergeLayout(base: QuoteLayoutConfig, overrides: Partial<QuoteLayoutConfig>): QuoteLayoutConfig {
  const definedOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined),
  ) as Partial<QuoteLayoutConfig>;

  return {
    ...base,
    ...definedOverrides,
    visible_fields: definedOverrides.visible_fields?.length ? definedOverrides.visible_fields : base.visible_fields,
  };
}

export function renderTemplate(template: string, data: Record<string, unknown>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    const value = data[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

export function extractDynamicParams(params: Record<string, unknown> | null): Record<string, unknown> {
  if (!isRecord(params)) return {};
  const out: Record<string, unknown> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (key === 'layout_overrides') return;
    out[key] = value;
  });
  return out;
}

export function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function numberToWordsPtBr(n: number): string {
  const units = ['', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = [
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ];

  if (n === 0) return 'zero';
  if (n === 100) return 'cem';

  const underThousand = (v: number): string => {
    const c = Math.floor(v / 100);
    const d = Math.floor((v % 100) / 10);
    const u = v % 10;
    const parts: string[] = [];
    if (c > 0) parts.push(hundreds[c]);
    if (d === 1) parts.push(teens[u]);
    else {
      if (d > 1) parts.push(tens[d]);
      if (u > 0) parts.push(units[u]);
    }
    return parts.join(' e ');
  };

  const parts: string[] = [];
  const millions = Math.floor(n / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const rest = n % 1000;

  if (millions > 0) parts.push(`${underThousand(millions)} ${millions === 1 ? 'milhao' : 'milhoes'}`);
  if (thousands > 0) {
    if (thousands === 1) parts.push('mil');
    else parts.push(`${underThousand(thousands)} mil`);
  }
  if (rest > 0) parts.push(underThousand(rest));
  return parts.join(' e ');
}

export function currencyToWordsPtBr(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  const positive = Math.abs(value);
  const integer = Math.floor(positive);
  const cents = Math.round((positive - integer) * 100);

  const reaisText = `${numberToWordsPtBr(integer)} ${integer === 1 ? 'real' : 'reais'}`;
  if (cents === 0) return reaisText;
  const centsText = `${numberToWordsPtBr(cents)} ${cents === 1 ? 'centavo' : 'centavos'}`;
  return `${reaisText} e ${centsText}`;
}

export interface TemplateBlock {
  type: 'title' | 'subtitle' | 'bullet' | 'paragraph' | 'spacer';
  text: string;
  justified: boolean;
}

export function parseTemplateBlocks(content: string, justifyAll = false): TemplateBlock[] {
  const lines = content.split(/\r?\n/);
  const out: TemplateBlock[] = [];
  let inJustifyBlock = false;
  lines.forEach((line) => {
    const hasStart = line.includes('{{just}}');
    const hasEnd = line.includes('{{/just}}');
    const cleanLine = line.replace(/\{\{just\}\}/g, '').replace(/\{\{\/just\}\}/g, '');
    const trimmed = cleanLine.trim();
    const justified = justifyAll || inJustifyBlock || hasStart || hasEnd;
    if (!trimmed) {
      out.push({ type: 'spacer' as const, text: '', justified: false });
    } else if (trimmed.startsWith('# ')) {
      out.push({ type: 'title' as const, text: trimmed.slice(2).trim(), justified: false });
    } else if (trimmed.startsWith('## ')) {
      out.push({ type: 'subtitle' as const, text: trimmed.slice(3).trim(), justified: false });
    } else if (trimmed.startsWith('- ')) {
      out.push({ type: 'bullet' as const, text: trimmed.slice(2).trim(), justified });
    } else {
      out.push({ type: 'paragraph' as const, text: trimmed, justified });
    }
    if (hasStart && !hasEnd) inJustifyBlock = true;
    if (hasEnd) inJustifyBlock = false;
  });
  return out;
}

function normalizeInlineText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

function hasHtmlTags(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value);
}

export function convertClipboardHtmlToTemplate(html: string, fallbackText = ''): string {
  const source = String(html ?? '').trim();
  if (!source || !hasHtmlTags(source)) return fallbackText;
  if (typeof DOMParser === 'undefined') return fallbackText;

  const doc = new DOMParser().parseFromString(source, 'text/html');
  const lines: string[] = [];

  const pushLine = (line: string) => {
    const clean = normalizeInlineText(line);
    if (!clean) return;
    lines.push(clean);
  };

  const walk = (node: Element) => {
    const tag = node.tagName.toLowerCase();
    if (tag === 'h1') {
      pushLine(`# ${node.textContent ?? ''}`);
      lines.push('');
      return;
    }
    if (tag === 'h2' || tag === 'h3') {
      pushLine(`## ${node.textContent ?? ''}`);
      lines.push('');
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      node.querySelectorAll(':scope > li').forEach((li) => {
        pushLine(`- ${li.textContent ?? ''}`);
      });
      lines.push('');
      return;
    }
    if (tag === 'p' || tag === 'div' || tag === 'blockquote') {
      pushLine(node.textContent ?? '');
      lines.push('');
      return;
    }
    if (tag === 'br') {
      lines.push('');
      return;
    }

    Array.from(node.children).forEach((child) => walk(child));
  };

  Array.from(doc.body.children).forEach((child) => walk(child));

  const out = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return out || fallbackText;
}

export function buildQuoteTemplateData(args: {
  quote: QuoteItem;
  contact: Contact | undefined;
  product: ProductItem | undefined;
  params: Record<string, unknown>;
  date: string;
  paymentTerms?: string;
}): Record<string, unknown> {
  return {
    cliente: args.contact?.name ?? '',
    empresa: args.contact?.company ?? '',
    telefone: args.contact?.phone ?? '',
    email: args.contact?.email ?? '',
    whatsapp: args.contact?.whatsapp ?? '',
    produto: args.product?.name ?? '',
    valor: typeof args.quote.total_value === 'number' ? formatCurrency(args.quote.total_value) : '',
    valor_extenso: currencyToWordsPtBr(args.quote.total_value),
    forma_pagamento: args.paymentTerms ?? '',
    data: args.date,
    status: args.quote.status,
    ...args.params,
  };
}

export function getPaymentTerms(params: Record<string, unknown> | null): string {
  if (!isRecord(params)) return '';
  return typeof params.payment_terms === 'string' ? params.payment_terms : '';
}

export function getQuoteItems(params: Record<string, unknown> | null): QuoteLineItem[] {
  if (!isRecord(params) || !Array.isArray(params.quote_items)) return [];
  return params.quote_items
    .map((item) => {
      if (!isRecord(item)) return null;
      const description = typeof item.description === 'string' ? item.description : '';
      const quantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity ?? 0);
      const unit_price = typeof item.unit_price === 'number' ? item.unit_price : Number(item.unit_price ?? 0);
      if (!description.trim()) return null;
      return {
        description: description.trim(),
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unit_price: Number.isFinite(unit_price) ? unit_price : 0,
      } as QuoteLineItem;
    })
    .filter((x): x is QuoteLineItem => Boolean(x));
}
