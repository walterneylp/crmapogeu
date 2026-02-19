import { useEffect, useRef, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { Contact, ProductItem, QuoteItem, QuoteModel } from '@/lib/types';
import { DEFAULT_QUOTE_LAYOUT, QUOTE_FIELD_OPTIONS, convertClipboardHtmlToTemplate, getModelDefaults, getModelLayoutConfig, type QuoteFieldKey } from '@/lib/quoteLayout';
import { uploadQuoteLogo } from '@/lib/storage';
import { QuoteDocumentPreview } from '@/components/QuoteDocumentPreview';
import { generateQuotePdf } from '@/lib/quotePdf';

const initialForm = {
  name: '',
  description: '',
  template_content: '',
  defaults_json: '{\n  "escopo": "",\n  "prazo_dias": 30\n}',
  active: true,
  logo_url: DEFAULT_QUOTE_LAYOUT.logo_url,
  logo_position: DEFAULT_QUOTE_LAYOUT.logo_position,
  logo_width: DEFAULT_QUOTE_LAYOUT.logo_width,
  footer_text: DEFAULT_QUOTE_LAYOUT.footer_text,
  watermark_text: DEFAULT_QUOTE_LAYOUT.watermark_text,
  show_watermark: DEFAULT_QUOTE_LAYOUT.show_watermark,
  show_signature: DEFAULT_QUOTE_LAYOUT.show_signature,
  signature_name: DEFAULT_QUOTE_LAYOUT.signature_name,
  signature_role: DEFAULT_QUOTE_LAYOUT.signature_role,
  font_family: DEFAULT_QUOTE_LAYOUT.font_family,
  body_font_size: DEFAULT_QUOTE_LAYOUT.body_font_size,
  title_font_size: DEFAULT_QUOTE_LAYOUT.title_font_size,
  subtitle_font_size: DEFAULT_QUOTE_LAYOUT.subtitle_font_size,
  date_position: DEFAULT_QUOTE_LAYOUT.date_position,
  primary_color: DEFAULT_QUOTE_LAYOUT.primary_color,
  title_color: DEFAULT_QUOTE_LAYOUT.title_color,
  subtitle_color: DEFAULT_QUOTE_LAYOUT.subtitle_color,
  body_color: DEFAULT_QUOTE_LAYOUT.body_color,
  header_line_color: DEFAULT_QUOTE_LAYOUT.header_line_color,
  footer_line_color: DEFAULT_QUOTE_LAYOUT.footer_line_color,
  table_line_color: DEFAULT_QUOTE_LAYOUT.table_line_color,
  header_line_width: DEFAULT_QUOTE_LAYOUT.header_line_width,
  footer_line_width: DEFAULT_QUOTE_LAYOUT.footer_line_width,
  table_line_width: DEFAULT_QUOTE_LAYOUT.table_line_width,
  show_summary: DEFAULT_QUOTE_LAYOUT.show_summary,
  show_additional_info: DEFAULT_QUOTE_LAYOUT.show_additional_info,
  show_recipient: DEFAULT_QUOTE_LAYOUT.show_recipient,
  recipient_template: DEFAULT_QUOTE_LAYOUT.recipient_template,
  justify_all: DEFAULT_QUOTE_LAYOUT.justify_all,
  show_commercial_terms: DEFAULT_QUOTE_LAYOUT.show_commercial_terms,
  visible_fields: DEFAULT_QUOTE_LAYOUT.visible_fields,
};

export function QuoteModelsPage() {
  const [models, setModels] = useState<QuoteModel[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPdfLoading, setPreviewPdfLoading] = useState(false);
  const templateRef = useRef<HTMLTextAreaElement | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('quote_models').select('*').order('name', { ascending: true });
    if (!error) setModels((data as QuoteModel[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const parseDefaultsJson = () => {
    try {
      return form.defaults_json.trim() ? (JSON.parse(form.defaults_json) as Record<string, unknown>) : {};
    } catch {
      throw new Error('JSON de parametros padrao invalido.');
    }
  };

  const buildPreviewArtifacts = () => {
    const defaultsParsed = parseDefaultsJson();
    const modelForPreview: QuoteModel = {
      id: editingId ?? 'preview-model',
      name: form.name.trim() || 'Modelo em preparacao',
      description: form.description || null,
      template_content: form.template_content || '# Modelo sem conteudo',
      parameters: {
        defaults: defaultsParsed,
        layout: {
          logo_url: form.logo_url.trim(),
          logo_position: form.logo_position,
          logo_width: form.logo_width,
          footer_text: form.footer_text.trim(),
          watermark_text: form.watermark_text.trim(),
          show_watermark: form.show_watermark,
          show_signature: form.show_signature,
          signature_name: form.signature_name.trim(),
          signature_role: form.signature_role.trim(),
          font_family: form.font_family,
          body_font_size: form.body_font_size,
          title_font_size: form.title_font_size,
          subtitle_font_size: form.subtitle_font_size,
          date_position: form.date_position,
          primary_color: form.primary_color,
          title_color: form.title_color,
          subtitle_color: form.subtitle_color,
          body_color: form.body_color,
          header_line_color: form.header_line_color,
          footer_line_color: form.footer_line_color,
          table_line_color: form.table_line_color,
          header_line_width: form.header_line_width,
          footer_line_width: form.footer_line_width,
          table_line_width: form.table_line_width,
          show_summary: form.show_summary,
          show_additional_info: form.show_additional_info,
          show_recipient: form.show_recipient,
          recipient_template: form.recipient_template,
          justify_all: form.justify_all,
          show_commercial_terms: form.show_commercial_terms,
          visible_fields: form.visible_fields,
        },
      },
      active: form.active,
    };

    const previewContact: Contact = {
      id: 'preview-contact',
      name: 'Cliente Exemplo',
      phone: '(11) 3333-4444',
      extension: null,
      email: 'cliente@exemplo.com',
      whatsapp: '(11) 99999-8888',
      company: 'Empresa Exemplo LTDA',
      role: 'Comprador',
      source: 'preview',
      client_group_id: null,
      current_stage_id: null,
      owner_user_id: null,
      created_at: new Date().toISOString(),
    };

    const previewProduct: ProductItem = {
      id: 'preview-product',
      name: 'Servico Exemplo',
      category: 'Servico',
      description: 'Descricao do servico exemplo',
      unit_price: 2500,
      active: true,
    };

    const previewQuote: QuoteItem = {
      id: 'preview-quote',
      contact_id: previewContact.id,
      product_id: previewProduct.id,
      quote_model_id: modelForPreview.id,
      title: `Previa - ${form.name.trim() || 'Modelo de Orcamento'}`,
      status: 'rascunho',
      total_value: 2500,
      parameters: {
        ...defaultsParsed,
        payment_terms: typeof defaultsParsed.payment_terms === 'string' ? defaultsParsed.payment_terms : '50% na assinatura e 50% em 30 dias',
        quote_items: Array.isArray(defaultsParsed.quote_items) && defaultsParsed.quote_items.length > 0
          ? defaultsParsed.quote_items
          : [{ description: 'Item exemplo', quantity: 1, unit_price: 2500 }],
      },
      generated_content: null,
      created_at: new Date().toISOString(),
    };

    return { modelForPreview, previewContact, previewProduct, previewQuote };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.template_content.trim()) return;

    try {
      const defaultsParsed = parseDefaultsJson();

      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        template_content: form.template_content,
        parameters: {
          defaults: defaultsParsed,
          layout: {
            logo_url: form.logo_url.trim(),
            logo_position: form.logo_position,
            logo_width: form.logo_width,
            footer_text: form.footer_text.trim(),
            watermark_text: form.watermark_text.trim(),
            show_watermark: form.show_watermark,
            show_signature: form.show_signature,
            signature_name: form.signature_name.trim(),
            signature_role: form.signature_role.trim(),
            font_family: form.font_family,
            body_font_size: form.body_font_size,
            title_font_size: form.title_font_size,
            subtitle_font_size: form.subtitle_font_size,
            date_position: form.date_position,
            primary_color: form.primary_color,
            title_color: form.title_color,
            subtitle_color: form.subtitle_color,
            body_color: form.body_color,
            header_line_color: form.header_line_color,
            footer_line_color: form.footer_line_color,
            table_line_color: form.table_line_color,
            header_line_width: form.header_line_width,
            footer_line_width: form.footer_line_width,
            table_line_width: form.table_line_width,
            show_summary: form.show_summary,
            show_additional_info: form.show_additional_info,
            show_recipient: form.show_recipient,
            recipient_template: form.recipient_template,
            justify_all: form.justify_all,
            show_commercial_terms: form.show_commercial_terms,
            visible_fields: form.visible_fields,
          },
        },
        active: form.active,
      };

      const op = editingId
        ? supabase.from('quote_models').update(payload).eq('id', editingId)
        : supabase.from('quote_models').insert(payload);

      const { error } = await op;
      if (error) return alert(error.message);
      setEditingId(null);
      setForm(initialForm);
      setShowPreview(false);
      load();
    } catch {
      alert('JSON de parametros padrao invalido.');
    }
  };

  const edit = (m: QuoteModel) => {
    const layout = getModelLayoutConfig(m);
    const defaults = getModelDefaults(m);
    setEditingId(m.id);
    setForm({
      name: m.name,
      description: m.description ?? '',
      template_content: m.template_content,
      defaults_json: JSON.stringify(defaults, null, 2),
      active: m.active,
      logo_url: layout.logo_url,
      logo_position: layout.logo_position,
      logo_width: layout.logo_width,
      footer_text: layout.footer_text,
      watermark_text: layout.watermark_text,
      show_watermark: layout.show_watermark,
      show_signature: layout.show_signature,
      signature_name: layout.signature_name,
      signature_role: layout.signature_role,
      font_family: layout.font_family,
      body_font_size: layout.body_font_size,
      title_font_size: layout.title_font_size,
      subtitle_font_size: layout.subtitle_font_size,
      date_position: layout.date_position,
      primary_color: layout.primary_color,
      title_color: layout.title_color,
      subtitle_color: layout.subtitle_color,
      body_color: layout.body_color,
      header_line_color: layout.header_line_color,
      footer_line_color: layout.footer_line_color,
      table_line_color: layout.table_line_color,
      header_line_width: layout.header_line_width,
      footer_line_width: layout.footer_line_width,
      table_line_width: layout.table_line_width,
      show_summary: layout.show_summary,
      show_additional_info: layout.show_additional_info,
      show_recipient: layout.show_recipient,
      recipient_template: layout.recipient_template,
      justify_all: layout.justify_all,
      show_commercial_terms: layout.show_commercial_terms,
      visible_fields: layout.visible_fields,
    });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Excluir modelo?')) return;
    const { error } = await supabase.from('quote_models').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  const toggleVisibleField = (field: QuoteFieldKey) => {
    setForm((prev) => {
      const exists = prev.visible_fields.includes(field);
      if (exists && prev.visible_fields.length === 1) return prev;
      return {
        ...prev,
        visible_fields: exists ? prev.visible_fields.filter((x) => x !== field) : [...prev.visible_fields, field],
      };
    });
  };

  const onLogoSelected = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem.');
      return;
    }
    if (file.type === 'image/svg+xml') {
      alert('SVG nao e suportado para geracao de PDF. Use PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('Logo muito grande. Limite de 3MB.');
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadQuoteLogo(file, 'quote-model-logos');
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no upload do logo.';
      alert(message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const onTemplatePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (!html) return;
    const currentText = e.currentTarget.value;
    const converted = convertClipboardHtmlToTemplate(html, '');
    if (!converted) return;

    e.preventDefault();
    const start = e.currentTarget.selectionStart ?? currentText.length;
    const end = e.currentTarget.selectionEnd ?? currentText.length;
    const before = currentText.slice(0, start);
    const after = currentText.slice(end);
    const spacerBefore = before && !before.endsWith('\n') ? '\n' : '';
    const spacerAfter = after && !after.startsWith('\n') ? '\n' : '';
    const next = `${before}${spacerBefore}${converted}${spacerAfter}${after}`;
    setForm((v) => ({ ...v, template_content: next }));
  };

  const justifySelectedTemplateText = () => {
    const textarea = templateRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    if (start === end) {
      alert('Selecione um trecho para justificar.');
      return;
    }
    setForm((prev) => {
      const source = prev.template_content;
      const selected = source.slice(start, end);
      if (!selected.trim()) return prev;
      const wrapped = `{{just}}${selected}{{/just}}`;
      return { ...prev, template_content: `${source.slice(0, start)}${wrapped}${source.slice(end)}` };
    });
  };

  const handlePreviewPdf = async () => {
    setPreviewPdfLoading(true);
    try {
      const { modelForPreview, previewContact, previewProduct, previewQuote } = buildPreviewArtifacts();
      await generateQuotePdf({
        quote: previewQuote,
        contact: previewContact,
        product: previewProduct,
        model: modelForPreview,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar preview em PDF.';
      alert(message);
    } finally {
      setPreviewPdfLoading(false);
    }
  };

  return (
    <div>
      <SectionTitle title="Modelos de Orçamento" subtitle="Layout profissional com personalizacao de logo, rodape, marca d'agua e campos" />
      <div className="mb-4 card p-4">
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input" placeholder="Nome" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
            <input className="input" placeholder="Descrição" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
          </div>
          <textarea ref={templateRef} className="input min-h-[180px]" placeholder={'Template formatado:\n# Titulo\n## Subtitulo\n- item\nParagrafo...\n\nVariaveis: {{cliente}}, {{valor_extenso}}, {{forma_pagamento}}, {{escopo}}\n\nDica: ao colar texto formatado, o sistema converte para manter estrutura.'} value={form.template_content} onPaste={onTemplatePaste} onChange={(e) => setForm((v) => ({ ...v, template_content: e.target.value }))} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={justifySelectedTemplateText}>
              Justificar trecho selecionado
            </button>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={form.justify_all} onChange={(e) => setForm((v) => ({ ...v, justify_all: e.target.checked }))} />
              Justificar texto completo
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input className="input" placeholder="URL do logo" value={form.logo_url} onChange={(e) => setForm((v) => ({ ...v, logo_url: e.target.value }))} />
            <label className="btn-secondary justify-center cursor-pointer">
              {uploadingLogo ? 'Enviando logo...' : 'Upload logo (Supabase)'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => onLogoSelected(e.target.files?.[0] ?? null)}
                />
            </label>
            <select className="input" value={form.logo_position} onChange={(e) => setForm((v) => ({ ...v, logo_position: e.target.value as typeof form.logo_position }))}>
              <option value="left">Logo a esquerda</option>
              <option value="center">Logo centralizado</option>
              <option value="right">Logo a direita</option>
            </select>
            <input className="input" type="number" min={60} max={240} placeholder="Largura logo (pt)" value={form.logo_width} onChange={(e) => setForm((v) => ({ ...v, logo_width: Number(e.target.value) || DEFAULT_QUOTE_LAYOUT.logo_width }))} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs font-semibold">Cor principal<input className="input mt-1 h-10 p-1" type="color" value={form.primary_color} onChange={(e) => setForm((v) => ({ ...v, primary_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor do titulo<input className="input mt-1 h-10 p-1" type="color" value={form.title_color} onChange={(e) => setForm((v) => ({ ...v, title_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor do subtitulo<input className="input mt-1 h-10 p-1" type="color" value={form.subtitle_color} onChange={(e) => setForm((v) => ({ ...v, subtitle_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor da fonte (padrao: preta)<input className="input mt-1 h-10 p-1" type="color" value={form.body_color} onChange={(e) => setForm((v) => ({ ...v, body_color: e.target.value }))} /></label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold">Cor da linha do cabecalho<input className="input mt-1 h-10 p-1" type="color" value={form.header_line_color} onChange={(e) => setForm((v) => ({ ...v, header_line_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor da linha do rodape<input className="input mt-1 h-10 p-1" type="color" value={form.footer_line_color} onChange={(e) => setForm((v) => ({ ...v, footer_line_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor das linhas da tabela<input className="input mt-1 h-10 p-1" type="color" value={form.table_line_color} onChange={(e) => setForm((v) => ({ ...v, table_line_color: e.target.value }))} /></label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-fg/80">
              Espessura linha cabecalho
              <input className="input mt-1" type="number" min={0.2} max={4} step="0.1" value={form.header_line_width} onChange={(e) => setForm((v) => ({ ...v, header_line_width: Number(e.target.value) || DEFAULT_QUOTE_LAYOUT.header_line_width }))} />
            </label>
            <label className="text-xs font-semibold text-fg/80">
              Espessura linha rodape
              <input className="input mt-1" type="number" min={0.2} max={4} step="0.1" value={form.footer_line_width} onChange={(e) => setForm((v) => ({ ...v, footer_line_width: Number(e.target.value) || DEFAULT_QUOTE_LAYOUT.footer_line_width }))} />
            </label>
            <label className="text-xs font-semibold text-fg/80">
              Espessura linhas tabela
              <input className="input mt-1" type="number" min={0.2} max={4} step="0.1" value={form.table_line_width} onChange={(e) => setForm((v) => ({ ...v, table_line_width: Number(e.target.value) || DEFAULT_QUOTE_LAYOUT.table_line_width }))} />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input className="input" placeholder="Rodapé" value={form.footer_text} onChange={(e) => setForm((v) => ({ ...v, footer_text: e.target.value }))} />
            <input className="input" placeholder="Texto da marca d'agua" value={form.watermark_text} onChange={(e) => setForm((v) => ({ ...v, watermark_text: e.target.value }))} />
            <select className="input" value={form.show_watermark ? 'true' : 'false'} onChange={(e) => setForm((v) => ({ ...v, show_watermark: e.target.value === 'true' }))}>
              <option value="false">Sem marca d'agua</option>
              <option value="true">Com marca d'agua</option>
            </select>
          </div>

          <select className="input" value={form.date_position} onChange={(e) => setForm((v) => ({ ...v, date_position: e.target.value as typeof form.date_position }))}>
            <option value="header-right">Data no topo (direita)</option>
            <option value="header-left">Data no topo (esquerda)</option>
            <option value="footer-right">Data no rodapé (direita)</option>
            <option value="footer-left">Data no rodapé (esquerda)</option>
          </select>

          <div className="grid gap-3 md:grid-cols-4">
            <select className="input" value={form.font_family} onChange={(e) => setForm((v) => ({ ...v, font_family: e.target.value as typeof form.font_family }))}>
              <option value="helvetica">Fonte Helvetica</option>
              <option value="times">Fonte Times</option>
              <option value="courier">Fonte Courier</option>
            </select>
            <label className="text-xs font-semibold text-fg/80">
              Tamanho da fonte do corpo
              <input className="input mt-1" type="number" min={9} max={16} value={form.body_font_size} onChange={(e) => setForm((v) => ({ ...v, body_font_size: Number(e.target.value) || DEFAULT_QUOTE_LAYOUT.body_font_size }))} />
            </label>
            <label className="text-xs font-semibold text-fg/80">
              Tamanho da fonte do titulo
              <input className="input mt-1" type="number" min={14} max={40} value={form.title_font_size} onChange={(e) => setForm((v) => ({ ...v, title_font_size: Number(e.target.value) || DEFAULT_QUOTE_LAYOUT.title_font_size }))} />
            </label>
            <label className="text-xs font-semibold text-fg/80">
              Tamanho da fonte do subtitulo
              <input className="input mt-1" type="number" min={11} max={30} value={form.subtitle_font_size} onChange={(e) => setForm((v) => ({ ...v, subtitle_font_size: Number(e.target.value) || DEFAULT_QUOTE_LAYOUT.subtitle_font_size }))} />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <select className="input" value={form.show_signature ? 'true' : 'false'} onChange={(e) => setForm((v) => ({ ...v, show_signature: e.target.value === 'true' }))}>
              <option value="false">Sem assinatura</option>
              <option value="true">Com assinatura</option>
            </select>
            <input className="input" placeholder="Nome da assinatura" value={form.signature_name} onChange={(e) => setForm((v) => ({ ...v, signature_name: e.target.value }))} />
            <input className="input" placeholder="Cargo da assinatura" value={form.signature_role} onChange={(e) => setForm((v) => ({ ...v, signature_role: e.target.value }))} />
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.show_summary} onChange={(e) => setForm((v) => ({ ...v, show_summary: e.target.checked }))} />
            Exibir bloco "Resumo do orçamento"
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.show_recipient} onChange={(e) => setForm((v) => ({ ...v, show_recipient: e.target.checked }))} />
            Incluir bloco "Destinatário"
          </label>
          <textarea
            className="input min-h-[84px]"
            placeholder={'Conteudo do destinatario (exemplo):\nContato: {{cliente}}\nEmpresa: {{empresa}}'}
            value={form.recipient_template}
            onChange={(e) => setForm((v) => ({ ...v, recipient_template: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.show_additional_info} onChange={(e) => setForm((v) => ({ ...v, show_additional_info: e.target.checked }))} />
            Exibir bloco "Informações adicionais"
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.show_commercial_terms} onChange={(e) => setForm((v) => ({ ...v, show_commercial_terms: e.target.checked }))} />
            Exibir bloco "Condições comerciais"
          </label>

          <div className="rounded-xl border bg-bg p-3">
            <p className="mb-2 text-sm font-semibold">Campos exibidos no resumo do documento</p>
            <div className="grid gap-2 md:grid-cols-3">
              {QUOTE_FIELD_OPTIONS.map((option) => (
                <label key={option.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.visible_fields.includes(option.key)}
                    onChange={() => toggleVisibleField(option.key)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <textarea className="input min-h-[120px] code" placeholder={`JSON de parametros padrao (chave: valor), por exemplo:
{
  "informacoes_adicionais": "",
  "escopo": "",
  "prazo_dias": 30,
  "validade_proposta": "15 dias"
}`} value={form.defaults_json} onChange={(e) => setForm((v) => ({ ...v, defaults_json: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={() => setShowPreview((prev) => !prev)}>
              {showPreview ? 'Ocultar preview' : 'Preview'}
            </button>
            <button className="btn-secondary" type="button" onClick={handlePreviewPdf} disabled={previewPdfLoading}>
              {previewPdfLoading ? 'Gerando PDF...' : 'Como ficaria no PDF'}
            </button>
            {editingId ? <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancelar</button> : null}
            <button className="btn-primary" type="submit">{editingId ? 'Atualizar' : 'Cadastrar modelo'}</button>
          </div>
        </form>
      </div>

      {showPreview ? (
        <div className="mb-4 card p-4">
          <p className="mb-3 text-sm font-semibold">Pre-visualizacao do modelo em preparacao</p>
          {(() => {
            try {
              const { modelForPreview, previewContact, previewProduct, previewQuote } = buildPreviewArtifacts();
              return (
                <QuoteDocumentPreview
                  quote={previewQuote}
                  contact={previewContact}
                  product={previewProduct}
                  model={modelForPreview}
                />
              );
            } catch {
              return (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  JSON de parametros padrao invalido. Corrija para visualizar o preview.
                </div>
              );
            }
          })()}
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left"><tr><th className="px-4 py-3">Modelo</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Layout</th><th className="px-4 py-3">Ações</th></tr></thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-3 font-semibold">{m.name}</td>
                <td className="px-4 py-3">{m.description ?? '-'}</td>
                <td className="px-4 py-3">{m.active ? 'Ativo' : 'Inativo'}</td>
                <td className="px-4 py-3 text-xs opacity-80">{m.parameters && typeof m.parameters === 'object' && 'layout' in m.parameters ? 'Personalizado' : 'Padrao'}</td>
                <td className="px-4 py-3"><div className="flex gap-2"><button className="btn-secondary" onClick={() => edit(m)} type="button">Editar</button><button className="btn-secondary" onClick={() => remove(m.id)} type="button">Excluir</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
