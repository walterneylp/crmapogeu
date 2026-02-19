import { parsePresentationBlocks, type PresentationLayoutConfig } from '@/lib/presentationLayout';

interface PresentationDocumentPreviewProps {
  title: string;
  content: string;
  layout: PresentationLayoutConfig;
  subtitle?: string;
}

export function PresentationDocumentPreview({
  title,
  content,
  layout,
  subtitle,
}: PresentationDocumentPreviewProps) {
  const blocks = parsePresentationBlocks(content || '', layout.justify_all);
  const fontClassByFamily: Record<string, string> = {
    helvetica: 'font-sans',
    times: 'font-serif',
    courier: 'font-mono',
  };
  const headerLineStyle = {
    borderBottomColor: layout.header_line_color,
    borderBottomWidth: `${layout.header_line_width}px`,
  };
  const footerLineStyle = {
    borderTopColor: layout.footer_line_color,
    borderTopWidth: `${layout.footer_line_width}px`,
  };

  return (
    <article
      className={`mx-auto w-full max-w-[820px] rounded-2xl border bg-white p-10 shadow-soft ${fontClassByFamily[layout.font_family] ?? 'font-sans'}`}
      style={{ fontSize: `${layout.body_font_size}px`, color: layout.body_color }}
    >
      <header className="border-b pb-5" style={headerLineStyle}>
        <div
          className={`flex items-center ${
            layout.logo_position === 'center'
              ? 'justify-center'
              : layout.logo_position === 'right'
                ? 'justify-end'
                : 'justify-start'
          }`}
        >
          {layout.logo_url ? (
            <img
              src={layout.logo_url}
              alt="Logo"
              style={{ width: `${layout.logo_width}px`, maxHeight: '72px', objectFit: 'contain' }}
            />
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-2 text-xs opacity-70">Sem logo</div>
          )}
        </div>
        {subtitle ? (
          <p
            className="mt-2 text-right uppercase tracking-wide opacity-80"
            style={{ fontSize: `${layout.subtitle_font_size}px`, color: layout.subtitle_color }}
          >
            {subtitle}
          </p>
        ) : null}
        <h1 className="mt-4 text-center font-extrabold uppercase tracking-wide" style={{ fontSize: `${layout.title_font_size}px`, color: layout.title_color }}>{title}</h1>
      </header>

      <section className="mt-10 space-y-2 leading-relaxed">
        {blocks.map((block, idx) => {
          if (block.type === 'spacer') return <div key={`sp-${idx}`} className="h-2" />;
          if (block.type === 'title')
            return (
              <h2 key={`tt-${idx}`} className="font-extrabold" style={{ fontSize: `${Math.max(layout.title_font_size - 4, 14)}px`, color: layout.title_color }}>
                {block.text}
              </h2>
            );
          if (block.type === 'subtitle')
            return (
              <h3 key={`st-${idx}`} className="font-bold" style={{ fontSize: `${layout.subtitle_font_size}px`, color: layout.subtitle_color }}>
                {block.text}
              </h3>
            );
          if (block.type === 'bullet') return <p key={`bl-${idx}`} style={block.justified ? { textAlign: 'justify' } : undefined}>• {block.text}</p>;
          return <p key={`p-${idx}`} style={block.justified ? { textAlign: 'justify' } : undefined}>{block.text}</p>;
        })}
      </section>

      <footer className="mt-8 border-t pt-3 text-center text-xs opacity-70" style={footerLineStyle}>
        {layout.footer_text}
      </footer>
    </article>
  );
}
