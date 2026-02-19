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

interface QuoteDocumentPreviewProps {
  quote: QuoteItem;
  contact?: Contact;
  product?: ProductItem;
  model?: QuoteModel;
}

const fieldLabels: Record<string, string> = {
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

const fontClassByFamily: Record<string, string> = {
  helvetica: 'font-sans',
  times: 'font-serif',
  courier: 'font-mono',
};

export function QuoteDocumentPreview({ quote, contact, product, model }: QuoteDocumentPreviewProps) {
  const params = (quote.parameters as Record<string, unknown> | null) ?? null;
  const dynamicParams = extractDynamicParams(params);
  const paymentTerms = getPaymentTerms(params);
  const items = getQuoteItems(params);
  const layout = mergeLayout(getModelLayoutConfig(model ?? null), getLayoutOverrides(params));

  const date = new Date(quote.created_at).toLocaleDateString('pt-BR');
  const templateData = buildQuoteTemplateData({ quote, contact, product, params: dynamicParams, date, paymentTerms });
  const bodyRaw = model ? renderTemplate(model.template_content, templateData) : quote.generated_content ?? '';
  const bodyBlocks = parseTemplateBlocks(bodyRaw, layout.justify_all);
  const recipientLines = renderTemplate(layout.recipient_template, templateData)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const dateBadge = <span className="text-xs font-semibold uppercase tracking-wide">Data: {date}</span>;

  const dataByKey: Record<string, string> = {
    cliente: String(templateData.cliente ?? '-'),
    empresa: String(templateData.empresa ?? '-'),
    telefone: String(templateData.telefone ?? '-'),
    email: String(templateData.email ?? '-'),
    whatsapp: String(templateData.whatsapp ?? '-'),
    produto: String(templateData.produto ?? '-'),
    valor: typeof quote.total_value === 'number' ? formatCurrency(quote.total_value) : '-',
    valor_extenso: String(templateData.valor_extenso ?? '-'),
    forma_pagamento: paymentTerms || '-',
    data: date,
    status: quote.status,
  };

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

  const tableTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const commercialConditions = [
    typeof dynamicParams.prazo_dias === 'number' ? `Prazo: ${dynamicParams.prazo_dias} dias` : null,
    typeof dynamicParams.validade_proposta === 'string' ? `Validade da proposta: ${dynamicParams.validade_proposta}` : null,
    paymentTerms ? `Pagamento: ${paymentTerms}` : null,
  ].filter((x): x is string => Boolean(x));

  const bodyColorStyle = { color: layout.body_color };
  const headerLineStyle = {
    borderBottomColor: layout.header_line_color,
    borderBottomWidth: `${layout.header_line_width}px`,
  };
  const footerLineStyle = {
    borderTopColor: layout.footer_line_color,
    borderTopWidth: `${layout.footer_line_width}px`,
  };
  const tableLineStyle = {
    borderColor: layout.table_line_color,
    borderBottomWidth: `${layout.table_line_width}px`,
  };

  return (
    <article
      className={`quote-print-area relative mx-auto w-full max-w-[820px] overflow-hidden rounded-2xl border bg-white p-10 shadow-soft ${fontClassByFamily[layout.font_family] ?? 'font-sans'}`}
      style={{ color: layout.body_color, fontSize: `${layout.body_font_size}px` }}
    >
      {layout.show_watermark ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="select-none text-[84px] font-extrabold tracking-[0.35em] text-slate-300/40 [transform:rotate(-32deg)]">
            {layout.watermark_text || 'ORÇAMENTO'}
          </p>
        </div>
      ) : null}

      <header className="relative z-10 border-b pb-5" style={headerLineStyle}>
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
            <img src={layout.logo_url} alt="Logo" style={{ width: `${layout.logo_width}px`, maxHeight: '72px', objectFit: 'contain' }} />
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-2 text-xs opacity-70">Sem logo</div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          {layout.date_position === 'header-left' ? dateBadge : <span />}
          <h1
            className="font-extrabold uppercase tracking-wide"
            style={{ color: layout.title_color, fontSize: `${layout.title_font_size}px` }}
          >
            {quote.title}
          </h1>
          {layout.date_position === 'header-right' ? dateBadge : <span />}
        </div>
      </header>

      {layout.show_summary ? (
        <section className="relative z-10 mt-6 grid gap-3 md:grid-cols-2">
          {layout.visible_fields.map((field) => (
            <div key={field} className="rounded-xl border bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide" style={bodyColorStyle}>{fieldLabels[field]}</p>
              <p className="mt-1 font-semibold" style={bodyColorStyle}>{dataByKey[field] || '-'}</p>
            </div>
          ))}
        </section>
      ) : null}

      {layout.show_recipient ? (
        <section className="relative z-10 mt-6 rounded-xl border p-5">
          {recipientLines.map((line, index) => (
            <p key={`recipient-${index}`} className={index === 0 ? 'font-semibold' : 'mt-1 font-semibold'} style={bodyColorStyle}>
              {line}
            </p>
          ))}
        </section>
      ) : null}

      <section className={`relative z-10 rounded-xl border p-5 ${layout.show_recipient ? 'mt-10' : 'mt-6'}`}>
        <h2 className="font-extrabold uppercase tracking-wide" style={{ color: layout.subtitle_color, fontSize: `${layout.subtitle_font_size}px` }}>
          Descrição da proposta
        </h2>
        <div className="mt-3 space-y-2">
          {bodyBlocks.map((block, idx) => {
            if (block.type === 'spacer') return <div key={`sp-${idx}`} className="h-2" />;
            if (block.type === 'title')
              return (
                <h3 key={`tt-${idx}`} className="font-extrabold" style={{ color: layout.title_color, fontSize: `${layout.title_font_size - 4}px` }}>
                  {block.text}
                </h3>
              );
            if (block.type === 'subtitle')
              return (
                <h4 key={`st-${idx}`} className="font-bold" style={{ color: layout.subtitle_color, fontSize: `${layout.subtitle_font_size}px` }}>
                  {block.text}
                </h4>
              );
            if (block.type === 'bullet')
              return (
                <p key={`bl-${idx}`} className="pl-4" style={block.justified ? { textAlign: 'justify' } : undefined}>
                  • {block.text}
                </p>
              );
            return <p key={`p-${idx}`} style={block.justified ? { textAlign: 'justify' } : undefined}>{block.text}</p>;
          })}
        </div>
      </section>

      {items.length ? (
        <section className="relative z-10 mt-6 rounded-xl border p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: layout.subtitle_color, fontSize: `${layout.subtitle_font_size}px` }}>
            Itens do orçamento
          </h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 text-left" style={bodyColorStyle}>Descrição</th>
                <th className="py-2 text-right">Qtd</th>
                <th className="py-2 text-right">Unitário</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={`${item.description}-${idx}`}>
                  <td className="py-2" style={bodyColorStyle}>{item.description}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 text-right">{formatCurrency(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 border-t" style={tableLineStyle} />
          <p className="mt-3 text-right font-bold">Total dos itens: {formatCurrency(tableTotal)}</p>
          <p className="mt-1 text-right text-sm font-semibold" style={bodyColorStyle}>
            ({currencyToWordsPtBr(tableTotal)})
          </p>
          <div className="mt-2 border-t" style={tableLineStyle} />
        </section>
      ) : null}

      {layout.show_commercial_terms && commercialConditions.length ? (
        <section className="relative z-10 mt-10 rounded-xl border p-5">
          <h2 className="font-extrabold uppercase tracking-wide" style={{ color: layout.subtitle_color, fontSize: `${layout.subtitle_font_size}px` }}>
            Condições comerciais
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {commercialConditions.map((line) => (
              <li key={line} style={bodyColorStyle}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {layout.show_additional_info && additionalParams.length ? (
        <section className="relative z-10 mt-6 rounded-xl border p-5">
          <h2 className="font-extrabold uppercase tracking-wide" style={{ color: layout.subtitle_color, fontSize: `${layout.subtitle_font_size}px` }}>
            Informações adicionais
          </h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {additionalParams.map(([key, value]) => (
              <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide" style={bodyColorStyle}>{key}</p>
                <p className="text-sm font-semibold" style={bodyColorStyle}>{typeof value === 'string' ? value : JSON.stringify(value)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {layout.show_signature ? (
        <section className="relative z-10 mt-10">
          <div className="mx-auto w-72 border-t pt-2 text-center">
            <p className="font-semibold" style={bodyColorStyle}>{layout.signature_name || 'Assinatura'}</p>
            <p className="text-xs opacity-70" style={bodyColorStyle}>{layout.signature_role}</p>
          </div>
        </section>
      ) : null}

      <footer className="relative z-10 mt-8 border-t pt-4 text-xs text-slate-500" style={footerLineStyle}>
        <div className="flex items-center justify-between">
          {layout.date_position === 'footer-left' ? dateBadge : <span />}
          <span>{layout.footer_text}</span>
          {layout.date_position === 'footer-right' ? dateBadge : <span />}
        </div>
      </footer>
    </article>
  );
}
