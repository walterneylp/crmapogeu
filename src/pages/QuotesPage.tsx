import { useEffect, useMemo, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { Contact, ProductItem, QuoteItem, QuoteModel } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import {
  DEFAULT_QUOTE_LAYOUT,
  QUOTE_FIELD_OPTIONS,
  currencyToWordsPtBr,
  buildQuoteTemplateData,
  getPaymentTerms,
  getQuoteItems,
  getLayoutOverrides,
  getModelDefaults,
  getModelLayoutConfig,
  mergeLayout,
  renderTemplate,
  type QuoteFieldKey,
} from '@/lib/quoteLayout';
import { QuoteDocumentPreview } from '@/components/QuoteDocumentPreview';
import { generateQuotePdf } from '@/lib/quotePdf';
import { uploadQuoteLogo } from '@/lib/storage';

type QuoteStatus = QuoteItem['status'];

const initialForm = {
  contact_id: '',
  product_id: '',
  quote_model_id: '',
  title: '',
  status: 'rascunho' as QuoteStatus,
  total_value: '',
  payment_terms: '',
  quote_items: [{ description: '', quantity: 1, unit_price: 0 }],
  parameters: '{\n  "escopo": "",\n  "prazo_dias": 30\n}',
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
  show_commercial_terms: DEFAULT_QUOTE_LAYOUT.show_commercial_terms,
  visible_fields: DEFAULT_QUOTE_LAYOUT.visible_fields,
};

export function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [models, setModels] = useState<QuoteModel[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [draftPreviewOpen, setDraftPreviewOpen] = useState(false);
  const [draftPdfLoading, setDraftPdfLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fail = (message: string) => {
    setFormFeedback({ type: 'error', message });
    alert(message);
  };

  const succeed = (message: string) => {
    setFormFeedback({ type: 'success', message });
    alert(message);
  };

  const contactNameById = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [contacts]);

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [products]);

  const modelNameById = useMemo(() => {
    const map = new Map<string, string>();
    models.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [models]);

  const previewQuote = useMemo(
    () => quotes.find((q) => q.id === previewQuoteId) ?? null,
    [quotes, previewQuoteId],
  );
  const previewContact = useMemo(
    () => contacts.find((c) => c.id === previewQuote?.contact_id),
    [contacts, previewQuote?.contact_id],
  );
  const previewProduct = useMemo(
    () => products.find((p) => p.id === previewQuote?.product_id),
    [products, previewQuote?.product_id],
  );
  const previewModel = useMemo(
    () => models.find((m) => m.id === previewQuote?.quote_model_id),
    [models, previewQuote?.quote_model_id],
  );

  const load = async () => {
    const [qRes, cRes, pRes, mRes] = await Promise.all([
      supabase.from('quotes').select('*').order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').order('name', { ascending: true }),
      supabase.from('products').select('*').eq('active', true).order('name', { ascending: true }),
      supabase.from('quote_models').select('*').eq('active', true).order('name', { ascending: true }),
    ]);

    if (!qRes.error) setQuotes((qRes.data as QuoteItem[]) ?? []);
    if (!cRes.error) setContacts((cRes.data as Contact[]) ?? []);
    if (!pRes.error) setProducts((pRes.data as ProductItem[]) ?? []);
    if (!mRes.error) setModels((mRes.data as QuoteModel[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const fillByModel = (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) {
      setForm((prev) => ({ ...prev, quote_model_id: '', ...DEFAULT_QUOTE_LAYOUT }));
      return;
    }

    const defaults = getModelDefaults(model);
    const layout = getModelLayoutConfig(model);
    const defaultPaymentTerms = typeof defaults.payment_terms === 'string' ? defaults.payment_terms : '';
    const defaultQuoteItems = Array.isArray(defaults.quote_items) && defaults.quote_items.length
      ? getQuoteItems({ quote_items: defaults.quote_items })
      : [{ description: '', quantity: 1, unit_price: 0 }];

    setForm((prev) => ({
      ...prev,
      quote_model_id: modelId,
      title: prev.title || `Orcamento - ${model.name}`,
      parameters: JSON.stringify(defaults, null, 2),
      payment_terms: prev.payment_terms || defaultPaymentTerms,
      quote_items: prev.quote_items.some((x) => x.description.trim()) ? prev.quote_items : defaultQuoteItems,
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
      show_commercial_terms: layout.show_commercial_terms,
      visible_fields: layout.visible_fields,
    }));
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

  const updateQuoteItem = (index: number, key: 'description' | 'quantity' | 'unit_price', value: string) => {
    setForm((prev) => {
      const next = prev.quote_items.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]:
                key === 'description'
                  ? value
                  : key === 'quantity'
                    ? Number((value || '').replace(/\D/g, '')) || 0
                    : Number((value || '').replace(',', '.')) || 0,
            }
          : item,
      );
      return { ...prev, quote_items: next };
    });
  };

  const addQuoteItem = () => {
    setForm((prev) => ({ ...prev, quote_items: [...prev.quote_items, { description: '', quantity: 1, unit_price: 0 }] }));
  };

  const removeQuoteItem = (index: number) => {
    setForm((prev) => {
      if (prev.quote_items.length === 1) return prev;
      return { ...prev, quote_items: prev.quote_items.filter((_, i) => i !== index) };
    });
  };

  const itemsTotal = useMemo(
    () => form.quote_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [form.quote_items],
  );

  const onLogoSelected = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem para o logo.');
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
      const url = await uploadQuoteLogo(file, 'quote-runtime-logos');
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no upload do logo.';
      alert(message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const buildDraftPreviewArtifacts = () => {
    const safeText = (value: unknown) => String(value ?? '').trim();
    let parsedParams: Record<string, unknown> = {};
    if (form.parameters.trim()) {
      parsedParams = JSON.parse(form.parameters) as Record<string, unknown>;
    }

    const selectedContact = contacts.find((c) => c.id === form.contact_id);
    const selectedProduct = products.find((p) => p.id === form.product_id);
    const selectedModel = models.find((m) => m.id === form.quote_model_id);

    const layoutOverrides = {
      logo_url: safeText(form.logo_url),
      logo_position: form.logo_position,
      logo_width: form.logo_width,
      footer_text: safeText(form.footer_text),
      watermark_text: safeText(form.watermark_text),
      show_watermark: form.show_watermark,
      show_signature: form.show_signature,
      signature_name: safeText(form.signature_name),
      signature_role: safeText(form.signature_role),
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
      show_commercial_terms: form.show_commercial_terms,
      visible_fields: form.visible_fields,
    };

    const normalizedItems = form.quote_items
      .map((item) => ({
        description: safeText(item.description),
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
      }))
      .filter((item) => item.description);

    const previewItems =
      normalizedItems.length > 0
        ? normalizedItems
        : [{ description: 'Item de exemplo', quantity: 1, unit_price: 1000 }];

    const totalFromItems = previewItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const parsedTotal = form.total_value ? Number(String(form.total_value).replace(',', '.')) : null;
    const totalValueNumber = parsedTotal && Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : totalFromItems;

    const paymentTerms =
      safeText(form.payment_terms) ||
      (typeof parsedParams.payment_terms === 'string' ? parsedParams.payment_terms.trim() : '') ||
      '50% na assinatura e 50% em 30 dias';

    const previewContact =
      selectedContact ??
      ({
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
      } as Contact);

    const previewProduct =
      selectedProduct ??
      ({
        id: 'preview-product',
        name: 'Servico Exemplo',
        category: 'Servico',
        description: 'Descricao do servico exemplo',
        unit_price: totalValueNumber,
        active: true,
      } as ProductItem);

    const previewQuote: QuoteItem = {
      id: editingId ?? 'draft-preview',
      contact_id: previewContact.id,
      product_id: previewProduct.id,
      quote_model_id: selectedModel?.id ?? null,
      title: safeText(form.title) || `Previa - ${selectedModel?.name ?? 'Orcamento'}`,
      status: form.status,
      total_value: totalValueNumber,
      parameters: {
        ...parsedParams,
        payment_terms: paymentTerms,
        quote_items: previewItems,
        layout_overrides: layoutOverrides,
      },
      generated_content: null,
      created_at: new Date().toISOString(),
    };

    return { previewQuote, previewContact, previewProduct, previewModel: selectedModel };
  };

  const exportDraftPdf = async () => {
    setDraftPdfLoading(true);
    try {
      const { previewQuote, previewContact, previewProduct, previewModel } = buildDraftPreviewArtifacts();
      await generateQuotePdf({
        quote: previewQuote,
        contact: previewContact,
        product: previewProduct,
        model: previewModel,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar PDF da pre-visualizacao.';
      alert(message);
    } finally {
      setDraftPdfLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback({ type: 'success', message: 'Processando atualizacao do orcamento...' });
    setSubmitting(true);
    try {
      const safeText = (value: unknown) => String(value ?? '').trim();
      const title = safeText(form.title);
      const paymentTerms = safeText(form.payment_terms);
      const logoUrl = safeText(form.logo_url);
      const footerText = safeText(form.footer_text);
      const watermarkText = safeText(form.watermark_text);
      const signatureName = safeText(form.signature_name);
      const signatureRole = safeText(form.signature_role);

      if (!title) {
        fail('Informe o titulo do orcamento.');
        return;
      }
      if (title.length < 5) {
        fail('Titulo deve ter pelo menos 5 caracteres.');
        return;
      }

      let parsedParams: Record<string, unknown> | null = null;
      try {
        parsedParams = form.parameters.trim() ? (JSON.parse(form.parameters) as Record<string, unknown>) : null;
      } catch {
        fail('Parametros JSON invalidos.');
        return;
      }

      const selectedContact = contacts.find((c) => c.id === form.contact_id);
      const selectedProduct = products.find((p) => p.id === form.product_id);
      const selectedModel = models.find((m) => m.id === form.quote_model_id);

      const layoutOverrides = {
        logo_url: logoUrl,
        logo_position: form.logo_position,
        logo_width: form.logo_width,
        footer_text: footerText,
        watermark_text: watermarkText,
        show_watermark: form.show_watermark,
        show_signature: form.show_signature,
        signature_name: signatureName,
        signature_role: signatureRole,
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
        show_commercial_terms: form.show_commercial_terms,
        visible_fields: form.visible_fields,
      };

      const normalizedItems = form.quote_items
        .map((item) => ({
          description: safeText(item.description),
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
        }))
        .filter((item) => item.description);

      if (normalizedItems.length === 0) {
        fail('Adicione pelo menos 1 item com descricao.');
        return;
      }
      for (const item of normalizedItems) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          fail(`Quantidade invalida no item "${item.description}". Use inteiro maior que zero.`);
          return;
        }
        if (item.unit_price <= 0) {
          fail(`Valor unitario invalido no item "${item.description}".`);
          return;
        }
      }
      if (!paymentTerms || paymentTerms.length < 8 || !/\d/.test(paymentTerms)) {
        fail('Informe uma forma de pagamento valida (com numeros e detalhes).');
        return;
      }

      const totalFromItems = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const parsedTotal = form.total_value ? Number(String(form.total_value).replace(',', '.')) : null;
      const totalValueNumber = parsedTotal ?? (normalizedItems.length ? totalFromItems : null);
      if (totalValueNumber === null || totalValueNumber <= 0) {
        fail('Valor total invalido.');
        return;
      }
      if (!Number.isFinite(totalValueNumber)) {
        fail('Valor total invalido. Use apenas numeros.');
        return;
      }

      const paramsForQuote: Record<string, unknown> = {
        ...(parsedParams ?? {}),
        payment_terms: paymentTerms,
        quote_items: normalizedItems,
        layout_overrides: layoutOverrides,
      };

      const mockQuote: QuoteItem = {
        id: editingId ?? '',
        contact_id: form.contact_id || null,
        product_id: form.product_id || null,
        quote_model_id: form.quote_model_id || null,
        title,
        status: form.status,
        total_value: totalValueNumber,
        parameters: paramsForQuote,
        generated_content: null,
        created_at: new Date().toISOString(),
      };

      const templateData = buildQuoteTemplateData({
        quote: mockQuote,
        contact: selectedContact,
        product: selectedProduct,
        params: parsedParams ?? {},
        date: new Date().toLocaleDateString('pt-BR'),
        paymentTerms,
      });

      const generated_content = selectedModel
        ? renderTemplate(selectedModel.template_content, templateData)
        : null;

      const payload = {
        contact_id: form.contact_id || null,
        product_id: form.product_id || null,
        quote_model_id: form.quote_model_id || null,
        title,
        status: form.status,
        total_value: totalValueNumber,
        parameters: paramsForQuote,
        generated_content,
      };

      const op = editingId
        ? supabase.from('quotes').update(payload).eq('id', editingId).select('id').maybeSingle()
        : supabase.from('quotes').insert(payload).select('id').maybeSingle();

      const { data, error } = await op;
      if (error) {
        fail(`Falha ao salvar: ${error.message}`);
        return;
      }
      if (!data?.id) {
        fail('Nao foi possivel confirmar a gravacao no banco. Nenhum registro foi alterado.');
        return;
      }

      const action = editingId ? 'atualizado' : 'criado';
      succeed(`Orcamento ${action} com sucesso.`);
      setEditingId(null);
      setForm(initialForm);
      setDraftPreviewOpen(false);
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao salvar orcamento.';
      fail(message);
    } finally {
      setSubmitting(false);
    }
  };

  const edit = (q: QuoteItem) => {
    setEditingId(q.id);
    setDraftPreviewOpen(false);
    setForm({
      contact_id: q.contact_id ?? '',
      product_id: q.product_id ?? '',
      quote_model_id: q.quote_model_id ?? '',
      title: q.title,
      status: q.status,
      total_value: q.total_value?.toString() ?? '',
      payment_terms: getPaymentTerms((q.parameters as Record<string, unknown> | null) ?? null),
      quote_items:
        getQuoteItems((q.parameters as Record<string, unknown> | null) ?? null).length > 0
          ? getQuoteItems((q.parameters as Record<string, unknown> | null) ?? null)
          : [{ description: '', quantity: 1, unit_price: 0 }],
      parameters: JSON.stringify(
        Object.fromEntries(
          Object.entries((q.parameters as Record<string, unknown> | null) ?? {}).filter(
            ([key]) => key !== 'layout_overrides' && key !== 'payment_terms' && key !== 'quote_items',
          ),
        ),
        null,
        2,
      ),
      ...mergeLayout(
        getModelLayoutConfig(models.find((m) => m.id === q.quote_model_id) ?? null),
        getLayoutOverrides((q.parameters as Record<string, unknown> | null) ?? null),
      ),
    });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Excluir orcamento?')) return;
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  const exportPreviewPdf = async () => {
    if (!previewQuote) return;
    setPdfLoading(true);
    try {
      await generateQuotePdf({
        quote: previewQuote,
        contact: previewContact,
        product: previewProduct,
        model: previewModel,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar PDF.';
      alert(message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Orcamentos"
        subtitle="Defina parametros, vincule modelos pre-definidos e gere documentos"
      />

      <div className="mb-4 card p-4">
        <form className="grid gap-3" onSubmit={submit} noValidate>
          {formFeedback ? (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                formFeedback.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
              }`}
            >
              {formFeedback.message}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="input"
              value={form.contact_id}
              onChange={(e) => setForm((v) => ({ ...v, contact_id: e.target.value }))}
            >
              <option value="">Contato</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={form.product_id}
              onChange={(e) => setForm((v) => ({ ...v, product_id: e.target.value }))}
            >
              <option value="">Produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={form.quote_model_id}
              onChange={(e) => fillByModel(e.target.value)}
            >
              <option value="">Modelo de orcamento</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="input md:col-span-2"
              placeholder="Titulo *"
              value={form.title}
              onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))}
            />
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((v) => ({ ...v, status: e.target.value as QuoteStatus }))}
            >
              <option value="rascunho">Rascunho</option>
              <option value="enviado">Enviado</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
          </div>

          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="Valor total"
            value={form.total_value}
            onChange={(e) => setForm((v) => ({ ...v, total_value: e.target.value }))}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border bg-bg p-3">
              <p className="mb-2 text-sm font-semibold">Itens do orçamento</p>
              <div className="space-y-2">
                {form.quote_items.map((item, index) => (
                  <div key={`quote-item-${index}`} className="grid gap-2 md:grid-cols-[1fr,120px,140px,110px]">
                    <label className="text-xs font-semibold text-fg/80">
                      Descricao do item
                      <input
                        className="input mt-1"
                        placeholder="Ex: Servico de instalacao"
                        value={item.description}
                        onChange={(e) => updateQuoteItem(index, 'description', e.target.value)}
                      />
                    </label>
                    <label className="text-xs font-semibold text-fg/80">
                      Quantidade
                      <input
                        className="input mt-1"
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Qtd"
                        value={item.quantity}
                        onChange={(e) => updateQuoteItem(index, 'quantity', e.target.value)}
                      />
                    </label>
                    <label className="text-xs font-semibold text-fg/80">
                      Valor unitario (R$)
                      <input
                        className="input mt-1"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Ex: 1500.00"
                        value={item.unit_price}
                        onChange={(e) => updateQuoteItem(index, 'unit_price', e.target.value)}
                      />
                    </label>
                    <div className="flex items-end">
                      <button className="btn-secondary w-full" type="button" onClick={() => removeQuoteItem(index)}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button className="btn-secondary" type="button" onClick={addQuoteItem}>
                  Adicionar item
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setForm((v) => ({ ...v, total_value: itemsTotal.toFixed(2) }))}
                >
                  Usar total dos itens ({itemsTotal.toFixed(2)})
                </button>
              </div>
            </div>
            <div className="rounded-xl border bg-bg p-3">
              <p className="mb-2 text-sm font-semibold">Pagamento e valor por extenso</p>
              <textarea
                className="input min-h-[88px]"
                placeholder="Forma de pagamento (ex: 30% entrada + 70% em 30 dias)"
                value={form.payment_terms}
                maxLength={500}
                onChange={(e) => setForm((v) => ({ ...v, payment_terms: e.target.value }))}
              />
              <p className="mt-3 text-xs opacity-75">
                Valor por extenso: {currencyToWordsPtBr(form.total_value ? Number(form.total_value) : null)}
              </p>
            </div>
          </div>

          <textarea
            className="input min-h-[120px]"
            placeholder={`Parametros JSON (chave: valor), por exemplo:
{
  "informacoes_adicionais": "Atendimento remoto incluso",
  "escopo": "Instalacao + configuracao",
  "prazo_dias": 30
}`}
            value={form.parameters}
            onChange={(e) => setForm((v) => ({ ...v, parameters: e.target.value }))}
          />

          <div className="rounded-xl border bg-bg p-3">
            <p className="mb-2 text-sm font-semibold">Personalizacao visual do documento</p>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="input"
                placeholder="URL do logo"
                value={form.logo_url}
                onChange={(e) => setForm((v) => ({ ...v, logo_url: e.target.value }))}
              />
              <label className="btn-secondary justify-center cursor-pointer">
                {uploadingLogo ? 'Enviando logo...' : 'Upload logo (Supabase)'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => onLogoSelected(e.target.files?.[0] ?? null)}
                />
              </label>
              <select
                className="input"
                value={form.logo_position}
                onChange={(e) => setForm((v) => ({ ...v, logo_position: e.target.value as typeof v.logo_position }))}
              >
                <option value="left">Logo a esquerda</option>
                <option value="center">Logo centralizado</option>
                <option value="right">Logo a direita</option>
              </select>
              <input
                className="input"
                type="number"
                min={60}
                max={240}
                value={form.logo_width}
                onChange={(e) => setForm((v) => ({ ...v, logo_width: Number(e.target.value) || DEFAULT_QUOTE_LAYOUT.logo_width }))}
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="text-xs font-semibold">Cor principal<input className="input mt-1 h-10 p-1" type="color" value={form.primary_color} onChange={(e) => setForm((v) => ({ ...v, primary_color: e.target.value }))} /></label>
              <label className="text-xs font-semibold">Cor do titulo<input className="input mt-1 h-10 p-1" type="color" value={form.title_color} onChange={(e) => setForm((v) => ({ ...v, title_color: e.target.value }))} /></label>
              <label className="text-xs font-semibold">Cor do subtitulo<input className="input mt-1 h-10 p-1" type="color" value={form.subtitle_color} onChange={(e) => setForm((v) => ({ ...v, subtitle_color: e.target.value }))} /></label>
              <label className="text-xs font-semibold">Cor da fonte (padrao: preta)<input className="input mt-1 h-10 p-1" type="color" value={form.body_color} onChange={(e) => setForm((v) => ({ ...v, body_color: e.target.value }))} /></label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="text-xs font-semibold">Cor da linha do cabecalho<input className="input mt-1 h-10 p-1" type="color" value={form.header_line_color} onChange={(e) => setForm((v) => ({ ...v, header_line_color: e.target.value }))} /></label>
              <label className="text-xs font-semibold">Cor da linha do rodape<input className="input mt-1 h-10 p-1" type="color" value={form.footer_line_color} onChange={(e) => setForm((v) => ({ ...v, footer_line_color: e.target.value }))} /></label>
              <label className="text-xs font-semibold">Cor das linhas da tabela<input className="input mt-1 h-10 p-1" type="color" value={form.table_line_color} onChange={(e) => setForm((v) => ({ ...v, table_line_color: e.target.value }))} /></label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
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

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input
                className="input"
                placeholder="Rodape"
                value={form.footer_text}
                onChange={(e) => setForm((v) => ({ ...v, footer_text: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Texto da marca d'agua"
                value={form.watermark_text}
                onChange={(e) => setForm((v) => ({ ...v, watermark_text: e.target.value }))}
              />
              <select
                className="input"
                value={form.show_watermark ? 'true' : 'false'}
                onChange={(e) => setForm((v) => ({ ...v, show_watermark: e.target.value === 'true' }))}
              >
                <option value="false">Sem marca d'agua</option>
                <option value="true">Com marca d'agua</option>
              </select>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select
                className="input"
                value={form.font_family}
                onChange={(e) => setForm((v) => ({ ...v, font_family: e.target.value as typeof v.font_family }))}
              >
                <option value="helvetica">Fonte Helvetica</option>
                <option value="times">Fonte Times</option>
                <option value="courier">Fonte Courier</option>
              </select>
              <select
                className="input"
                value={form.date_position}
                onChange={(e) => setForm((v) => ({ ...v, date_position: e.target.value as typeof v.date_position }))}
              >
                <option value="header-right">Data no topo (direita)</option>
                <option value="header-left">Data no topo (esquerda)</option>
                <option value="footer-right">Data no rodape (direita)</option>
                <option value="footer-left">Data no rodape (esquerda)</option>
              </select>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
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

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <select className="input" value={form.show_signature ? 'true' : 'false'} onChange={(e) => setForm((v) => ({ ...v, show_signature: e.target.value === 'true' }))}>
                <option value="false">Sem assinatura</option>
                <option value="true">Com assinatura</option>
              </select>
              <input className="input" placeholder="Nome assinatura" value={form.signature_name} onChange={(e) => setForm((v) => ({ ...v, signature_name: e.target.value }))} />
              <input className="input" placeholder="Cargo assinatura" value={form.signature_role} onChange={(e) => setForm((v) => ({ ...v, signature_role: e.target.value }))} />
            </div>

            <div className="mt-3 grid gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.show_summary} onChange={(e) => setForm((v) => ({ ...v, show_summary: e.target.checked }))} />
                Exibir bloco "Resumo do orçamento"
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.show_additional_info} onChange={(e) => setForm((v) => ({ ...v, show_additional_info: e.target.checked }))} />
                Exibir bloco "Informações adicionais"
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.show_commercial_terms} onChange={(e) => setForm((v) => ({ ...v, show_commercial_terms: e.target.checked }))} />
                Exibir bloco "Condições comerciais"
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg/70">Campos visiveis no resumo</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {QUOTE_FIELD_OPTIONS.map((option) => (
                    <label key={option.key} className="flex items-center gap-2 text-xs text-fg">
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
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={() => setDraftPreviewOpen((prev) => !prev)}>
              {draftPreviewOpen ? 'Ocultar preview' : 'Preview'}
            </button>
            <button className="btn-secondary" type="button" onClick={exportDraftPdf} disabled={draftPdfLoading}>
              {draftPdfLoading ? 'Gerando PDF...' : 'Como ficaria no PDF'}
            </button>
            {editingId ? (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                  setDraftPreviewOpen(false);
                }}
              >
                Cancelar
              </button>
            ) : null}
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : editingId ? 'Atualizar orcamento' : 'Gerar orcamento'}
            </button>
          </div>
        </form>
      </div>

      {draftPreviewOpen ? (
        <div className="mb-4 card p-4">
          <p className="mb-3 text-sm font-semibold">Pre-visualizacao do orcamento em preparacao</p>
          {(() => {
            try {
              const { previewQuote, previewContact, previewProduct, previewModel } = buildDraftPreviewArtifacts();
              return (
                <QuoteDocumentPreview
                  quote={previewQuote}
                  contact={previewContact}
                  product={previewProduct}
                  model={previewModel}
                />
              );
            } catch {
              return (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  Parametros JSON invalidos. Corrija para visualizar o preview.
                </div>
              );
            }
          })()}
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-4 py-3">Titulo</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-t align-top">
                <td className="px-4 py-3 font-semibold">{q.title}</td>
                <td className="px-4 py-3">{q.contact_id ? contactNameById.get(q.contact_id) ?? '-' : '-'}</td>
                <td className="px-4 py-3">{q.product_id ? productNameById.get(q.product_id) ?? '-' : '-'}</td>
                <td className="px-4 py-3">{q.quote_model_id ? modelNameById.get(q.quote_model_id) ?? '-' : '-'}</td>
                <td className="px-4 py-3">{q.status}</td>
                <td className="px-4 py-3">{formatDateTime(q.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" type="button" onClick={() => edit(q)}>
                      Editar
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => setPreviewQuoteId(q.id)}>
                      Visualizar / PDF
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => remove(q.id)}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!quotes.length ? (
              <tr>
                <td className="px-4 py-8 text-center opacity-70" colSpan={7}>
                  Nenhum orcamento cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {previewQuote ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/55 p-4 print:bg-transparent">
          <div className="mx-auto max-w-6xl">
            <div className="print-hidden mb-3 flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={() => setPreviewQuoteId(null)}>
                Fechar
              </button>
              <button className="btn-primary" type="button" onClick={exportPreviewPdf} disabled={pdfLoading}>
                {pdfLoading ? 'Gerando PDF...' : 'Gerar PDF'}
              </button>
            </div>
            <QuoteDocumentPreview
              quote={previewQuote}
              contact={previewContact}
              product={previewProduct}
              model={previewModel}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
