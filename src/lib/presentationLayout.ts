export interface PresentationLayoutConfig {
  logo_url: string;
  logo_position: 'left' | 'center' | 'right';
  logo_width: number;
  font_family: 'helvetica' | 'times' | 'courier';
  body_font_size: number;
  title_font_size: number;
  subtitle_font_size: number;
  title_color: string;
  subtitle_color: string;
  body_color: string;
  justify_all: boolean;
  header_line_color: string;
  header_line_width: number;
  footer_line_color: string;
  footer_line_width: number;
  footer_text: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const DEFAULT_PRESENTATION_LAYOUT: PresentationLayoutConfig = {
  logo_url: '',
  logo_position: 'left',
  logo_width: 120,
  font_family: 'helvetica',
  body_font_size: 11,
  title_font_size: 22,
  subtitle_font_size: 12,
  title_color: '#0f172a',
  subtitle_color: '#64748b',
  body_color: '#000000',
  justify_all: false,
  header_line_color: '#334155',
  header_line_width: 1.2,
  footer_line_color: '#334155',
  footer_line_width: 1,
  footer_text: 'Apresentação comercial',
};

export function getPresentationLayoutConfig(parameters: Record<string, unknown> | null | undefined): PresentationLayoutConfig {
  const raw = isRecord(parameters) && isRecord(parameters.layout) ? parameters.layout : {};
  return {
    logo_url: typeof raw.logo_url === 'string' ? raw.logo_url : DEFAULT_PRESENTATION_LAYOUT.logo_url,
    logo_position:
      raw.logo_position === 'center' || raw.logo_position === 'right'
        ? raw.logo_position
        : DEFAULT_PRESENTATION_LAYOUT.logo_position,
    logo_width:
      typeof raw.logo_width === 'number' && Number.isFinite(raw.logo_width)
        ? Math.min(240, Math.max(60, raw.logo_width))
        : DEFAULT_PRESENTATION_LAYOUT.logo_width,
    font_family:
      raw.font_family === 'times' || raw.font_family === 'courier'
        ? raw.font_family
        : DEFAULT_PRESENTATION_LAYOUT.font_family,
    body_font_size:
      typeof raw.body_font_size === 'number' && Number.isFinite(raw.body_font_size)
        ? Math.min(18, Math.max(9, raw.body_font_size))
        : DEFAULT_PRESENTATION_LAYOUT.body_font_size,
    title_font_size:
      typeof raw.title_font_size === 'number' && Number.isFinite(raw.title_font_size)
        ? Math.min(40, Math.max(14, raw.title_font_size))
        : DEFAULT_PRESENTATION_LAYOUT.title_font_size,
    subtitle_font_size:
      typeof raw.subtitle_font_size === 'number' && Number.isFinite(raw.subtitle_font_size)
        ? Math.min(24, Math.max(10, raw.subtitle_font_size))
        : DEFAULT_PRESENTATION_LAYOUT.subtitle_font_size,
    title_color:
      typeof raw.title_color === 'string' ? raw.title_color : DEFAULT_PRESENTATION_LAYOUT.title_color,
    subtitle_color:
      typeof raw.subtitle_color === 'string' ? raw.subtitle_color : DEFAULT_PRESENTATION_LAYOUT.subtitle_color,
    body_color:
      typeof raw.body_color === 'string' ? raw.body_color : DEFAULT_PRESENTATION_LAYOUT.body_color,
    justify_all: typeof raw.justify_all === 'boolean' ? raw.justify_all : DEFAULT_PRESENTATION_LAYOUT.justify_all,
    header_line_color:
      typeof raw.header_line_color === 'string'
        ? raw.header_line_color
        : DEFAULT_PRESENTATION_LAYOUT.header_line_color,
    header_line_width:
      typeof raw.header_line_width === 'number' && Number.isFinite(raw.header_line_width)
        ? Math.min(4, Math.max(0.2, raw.header_line_width))
        : DEFAULT_PRESENTATION_LAYOUT.header_line_width,
    footer_line_color:
      typeof raw.footer_line_color === 'string'
        ? raw.footer_line_color
        : DEFAULT_PRESENTATION_LAYOUT.footer_line_color,
    footer_line_width:
      typeof raw.footer_line_width === 'number' && Number.isFinite(raw.footer_line_width)
        ? Math.min(4, Math.max(0.2, raw.footer_line_width))
        : DEFAULT_PRESENTATION_LAYOUT.footer_line_width,
    footer_text:
      typeof raw.footer_text === 'string' ? raw.footer_text : DEFAULT_PRESENTATION_LAYOUT.footer_text,
  };
}

export function buildPresentationParameters(layout: PresentationLayoutConfig): Record<string, unknown> {
  return { layout };
}

export interface PresentationContentBlock {
  type: 'title' | 'subtitle' | 'bullet' | 'paragraph' | 'spacer';
  text: string;
  justified: boolean;
}

export function parsePresentationBlocks(content: string, justifyAll = false): PresentationContentBlock[] {
  const lines = content.split(/\r?\n/);
  const out: PresentationContentBlock[] = [];
  let inJustifyBlock = false;

  lines.forEach((rawLine) => {
    const hasStart = rawLine.includes('{{just}}');
    const hasEnd = rawLine.includes('{{/just}}');
    const cleanLine = rawLine.replace(/\{\{just\}\}/g, '').replace(/\{\{\/just\}\}/g, '');
    const trimmed = cleanLine.trim();

    const justified = justifyAll || inJustifyBlock || hasStart || hasEnd;

    if (!trimmed) {
      out.push({ type: 'spacer', text: '', justified: false });
    } else if (trimmed.startsWith('# ')) {
      out.push({ type: 'title', text: trimmed.slice(2).trim(), justified: false });
    } else if (trimmed.startsWith('## ')) {
      out.push({ type: 'subtitle', text: trimmed.slice(3).trim(), justified: false });
    } else if (trimmed.startsWith('- ')) {
      out.push({ type: 'bullet', text: trimmed.slice(2).trim(), justified });
    } else {
      out.push({ type: 'paragraph', text: trimmed, justified });
    }

    if (hasStart && !hasEnd) inJustifyBlock = true;
    if (hasEnd) inJustifyBlock = false;
  });

  return out;
}
