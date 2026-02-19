import { useEffect, useMemo, useRef, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { CompanyPresentation, ProductItem, ProductPresentation } from '@/lib/types';
import { convertClipboardHtmlToTemplate } from '@/lib/quoteLayout';
import {
  DEFAULT_PRESENTATION_LAYOUT,
  buildPresentationParameters,
  getPresentationLayoutConfig,
  type PresentationLayoutConfig,
} from '@/lib/presentationLayout';
import { uploadQuoteLogo } from '@/lib/storage';
import { PresentationDocumentPreview } from '@/components/PresentationDocumentPreview';
import { generatePresentationPdf } from '@/lib/presentationPdf';

type PresentationEditorForm = {
  title: string;
  content: string;
  active: boolean;
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
};
type ProductPresentationEditorForm = PresentationEditorForm & { product_id: string };

const buildInitialForm = (): PresentationEditorForm => ({
  title: '',
  content: '',
  active: true,
  logo_url: DEFAULT_PRESENTATION_LAYOUT.logo_url,
  logo_position: DEFAULT_PRESENTATION_LAYOUT.logo_position,
  logo_width: DEFAULT_PRESENTATION_LAYOUT.logo_width,
  font_family: DEFAULT_PRESENTATION_LAYOUT.font_family,
  body_font_size: DEFAULT_PRESENTATION_LAYOUT.body_font_size,
  title_font_size: DEFAULT_PRESENTATION_LAYOUT.title_font_size,
  subtitle_font_size: DEFAULT_PRESENTATION_LAYOUT.subtitle_font_size,
  title_color: DEFAULT_PRESENTATION_LAYOUT.title_color,
  subtitle_color: DEFAULT_PRESENTATION_LAYOUT.subtitle_color,
  body_color: DEFAULT_PRESENTATION_LAYOUT.body_color,
  justify_all: DEFAULT_PRESENTATION_LAYOUT.justify_all,
  header_line_color: DEFAULT_PRESENTATION_LAYOUT.header_line_color,
  header_line_width: DEFAULT_PRESENTATION_LAYOUT.header_line_width,
  footer_line_color: DEFAULT_PRESENTATION_LAYOUT.footer_line_color,
  footer_line_width: DEFAULT_PRESENTATION_LAYOUT.footer_line_width,
  footer_text: DEFAULT_PRESENTATION_LAYOUT.footer_text,
});

const initialCompany = buildInitialForm();
const initialProduct: ProductPresentationEditorForm = {
  product_id: '',
  ...buildInitialForm(),
  footer_text: 'Apresentação de produto',
};

function toLayout(form: PresentationEditorForm): PresentationLayoutConfig {
  return {
    logo_url: form.logo_url.trim(),
    logo_position: form.logo_position,
    logo_width: form.logo_width,
    font_family: form.font_family,
    body_font_size: form.body_font_size,
    title_font_size: form.title_font_size,
    subtitle_font_size: form.subtitle_font_size,
    title_color: form.title_color,
    subtitle_color: form.subtitle_color,
    body_color: form.body_color,
    justify_all: form.justify_all,
    header_line_color: form.header_line_color,
    header_line_width: form.header_line_width,
    footer_line_color: form.footer_line_color,
    footer_line_width: form.footer_line_width,
    footer_text: form.footer_text.trim(),
  };
}

function applyLayout(base: PresentationEditorForm, layout: PresentationLayoutConfig): PresentationEditorForm {
  return {
    ...base,
    logo_url: layout.logo_url,
    logo_position: layout.logo_position,
    logo_width: layout.logo_width,
    font_family: layout.font_family,
    body_font_size: layout.body_font_size,
    title_font_size: layout.title_font_size,
    subtitle_font_size: layout.subtitle_font_size,
    title_color: layout.title_color,
    subtitle_color: layout.subtitle_color,
    body_color: layout.body_color,
    justify_all: layout.justify_all,
    header_line_color: layout.header_line_color,
    header_line_width: layout.header_line_width,
    footer_line_color: layout.footer_line_color,
    footer_line_width: layout.footer_line_width,
    footer_text: layout.footer_text,
  };
}

function applyLayoutProduct(
  base: ProductPresentationEditorForm,
  layout: PresentationLayoutConfig,
): ProductPresentationEditorForm {
  return {
    ...base,
    logo_url: layout.logo_url,
    logo_position: layout.logo_position,
    logo_width: layout.logo_width,
    font_family: layout.font_family,
    body_font_size: layout.body_font_size,
    title_font_size: layout.title_font_size,
    subtitle_font_size: layout.subtitle_font_size,
    title_color: layout.title_color,
    subtitle_color: layout.subtitle_color,
    body_color: layout.body_color,
    justify_all: layout.justify_all,
    header_line_color: layout.header_line_color,
    header_line_width: layout.header_line_width,
    footer_line_color: layout.footer_line_color,
    footer_line_width: layout.footer_line_width,
    footer_text: layout.footer_text,
  };
}

export function PresentationsPage({ section = 'all' }: { section?: 'company' | 'product' | 'all' }) {
  const [companyItems, setCompanyItems] = useState<CompanyPresentation[]>([]);
  const [productItems, setProductItems] = useState<ProductPresentation[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  const [companyForm, setCompanyForm] = useState(initialCompany);
  const [productForm, setProductForm] = useState(initialProduct);

  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [showCompanyPreview, setShowCompanyPreview] = useState(false);
  const [showProductPreview, setShowProductPreview] = useState(false);
  const [companyPdfLoading, setCompanyPdfLoading] = useState(false);
  const [productPdfLoading, setProductPdfLoading] = useState(false);
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
  const [uploadingProductLogo, setUploadingProductLogo] = useState(false);
  const companyContentRef = useRef<HTMLTextAreaElement | null>(null);
  const productContentRef = useRef<HTMLTextAreaElement | null>(null);

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [products]);

  const load = async () => {
    const [cRes, ppRes, pRes] = await Promise.all([
      supabase.from('company_presentations').select('*').order('created_at', { ascending: false }),
      supabase.from('product_presentations').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name', { ascending: true }),
    ]);

    if (!cRes.error) setCompanyItems((cRes.data as CompanyPresentation[]) ?? []);
    if (!ppRes.error) setProductItems((ppRes.data as ProductPresentation[]) ?? []);
    if (!pRes.error) setProducts((pRes.data as ProductItem[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const onPasteFormatted =
    <T extends { content: string }>(setForm: React.Dispatch<React.SetStateAction<T>>) =>
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const html = e.clipboardData.getData('text/html');
      if (!html) return;
      const converted = convertClipboardHtmlToTemplate(html, '');
      if (!converted) return;
      e.preventDefault();
      const currentText = e.currentTarget.value;
      const start = e.currentTarget.selectionStart ?? currentText.length;
      const end = e.currentTarget.selectionEnd ?? currentText.length;
      const before = currentText.slice(0, start);
      const after = currentText.slice(end);
      const spacerBefore = before && !before.endsWith('\n') ? '\n' : '';
      const spacerAfter = after && !after.startsWith('\n') ? '\n' : '';
      const next = `${before}${spacerBefore}${converted}${spacerAfter}${after}`;
      setForm((prev) => ({ ...prev, content: next }));
    };

  const onLogoSelected = async <T extends { logo_url: string }>(
    file: File | null,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
    setForm: React.Dispatch<React.SetStateAction<T>>,
    folder: string,
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Selecione um arquivo de imagem para o logo.');
    if (file.type === 'image/svg+xml') return alert('SVG não é suportado para PDF. Use PNG, JPG ou WEBP.');
    if (file.size > 3 * 1024 * 1024) return alert('Logo muito grande. Limite de 3MB.');
    setUploading(true);
    try {
      const url = await uploadQuoteLogo(file, folder);
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no upload do logo.';
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const justifySelectedText = <T extends { content: string }>(
    textarea: HTMLTextAreaElement | null,
    setForm: React.Dispatch<React.SetStateAction<T>>,
  ) => {
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    if (start === end) {
      alert('Selecione um trecho para justificar.');
      return;
    }

    setForm((prev) => {
      const source = prev.content;
      const selected = source.slice(start, end);
      if (!selected.trim()) return prev;
      const wrapped = `{{just}}${selected}{{/just}}`;
      return { ...prev, content: `${source.slice(0, start)}${wrapped}${source.slice(end)}` };
    });
  };

  const submitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.title.trim() || !companyForm.content.trim()) return;

    const payload = {
      title: companyForm.title.trim(),
      content: companyForm.content.trim(),
      parameters: buildPresentationParameters(toLayout(companyForm)),
      active: companyForm.active,
    };

    const op = editingCompanyId
      ? supabase.from('company_presentations').update(payload).eq('id', editingCompanyId)
      : supabase.from('company_presentations').insert(payload);

    const { error } = await op;
    if (error) return alert(error.message);

    setEditingCompanyId(null);
    setCompanyForm(initialCompany);
    setShowCompanyPreview(false);
    load();
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title.trim() || !productForm.content.trim()) return;

    const payload = {
      product_id: productForm.product_id || null,
      title: productForm.title.trim(),
      content: productForm.content.trim(),
      parameters: buildPresentationParameters(toLayout(productForm)),
      active: productForm.active,
    };

    const op = editingProductId
      ? supabase.from('product_presentations').update(payload).eq('id', editingProductId)
      : supabase.from('product_presentations').insert(payload);

    const { error } = await op;
    if (error) return alert(error.message);

    setEditingProductId(null);
    setProductForm(initialProduct);
    setShowProductPreview(false);
    load();
  };

  const editCompany = (item: CompanyPresentation) => {
    setEditingCompanyId(item.id);
    setShowCompanyPreview(false);
    const layout = getPresentationLayoutConfig(item.parameters);
    setCompanyForm(applyLayout({ ...initialCompany, title: item.title, content: item.content, active: item.active }, layout));
  };

  const removeCompany = async (id: string) => {
    if (!window.confirm('Excluir apresentação da empresa?')) return;
    const { error } = await supabase.from('company_presentations').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  const editProduct = (item: ProductPresentation) => {
    setEditingProductId(item.id);
    setShowProductPreview(false);
    const layout = getPresentationLayoutConfig(item.parameters);
    setProductForm(
      applyLayoutProduct(
        {
          ...initialProduct,
          product_id: item.product_id ?? '',
          title: item.title,
          content: item.content,
          active: item.active,
        } as ProductPresentationEditorForm,
        layout,
      ),
    );
  };

  const removeProduct = async (id: string) => {
    if (!window.confirm('Excluir apresentação de produto?')) return;
    const { error } = await supabase.from('product_presentations').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  const exportCompanyPreviewPdf = async () => {
    setCompanyPdfLoading(true);
    try {
      await generatePresentationPdf({
        title: companyForm.title.trim() || 'Apresentação da empresa',
        content: companyForm.content,
        layout: toLayout(companyForm),
        subtitle: 'Apresentação institucional',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar PDF da prévia.';
      alert(message);
    } finally {
      setCompanyPdfLoading(false);
    }
  };

  const exportProductPreviewPdf = async () => {
    setProductPdfLoading(true);
    try {
      const productName = productForm.product_id ? productNameById.get(productForm.product_id) ?? 'Produto' : 'Produto';
      await generatePresentationPdf({
        title: productForm.title.trim() || 'Apresentação de produto',
        content: productForm.content,
        layout: toLayout(productForm),
        subtitle: `Produto: ${productName}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar PDF da prévia.';
      alert(message);
    } finally {
      setProductPdfLoading(false);
    }
  };

  const showCompanySection = section === 'all' || section === 'company';
  const showProductSection = section === 'all' || section === 'product';
  const pageSubtitle =
    section === 'company'
      ? 'Apresentações da empresa'
      : section === 'product'
        ? 'Apresentações de produtos'
        : 'Estrutura em lista, editor com cola formatada, preview na tela e geração em PDF';

  return (
    <div>
      <SectionTitle
        title="Apresentações"
        subtitle={pageSubtitle}
      />

      {showCompanySection ? (
      <div className="mb-4 card p-4">
        <h2 className="mb-3 text-lg font-extrabold">Apresentação da empresa</h2>
        <form className="grid gap-3" onSubmit={submitCompany}>
          <input className="input" placeholder="Título" value={companyForm.title} onChange={(e) => setCompanyForm((v) => ({ ...v, title: e.target.value }))} />
          <textarea
            className="input min-h-[180px]"
            placeholder={'Cole seu conteúdo formatado aqui.\n\nDica: títulos/listas colados serão convertidos para estrutura do preview/PDF.'}
            value={companyForm.content}
            ref={companyContentRef}
            onPaste={onPasteFormatted(setCompanyForm)}
            onChange={(e) => setCompanyForm((v) => ({ ...v, content: e.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={() => justifySelectedText(companyContentRef.current, setCompanyForm)}>
              Justificar trecho selecionado
            </button>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={companyForm.justify_all} onChange={(e) => setCompanyForm((v) => ({ ...v, justify_all: e.target.checked }))} />
              Justificar texto completo
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input className="input" placeholder="URL do logo" value={companyForm.logo_url} onChange={(e) => setCompanyForm((v) => ({ ...v, logo_url: e.target.value }))} />
            <label className="btn-secondary justify-center cursor-pointer">
              {uploadingCompanyLogo ? 'Enviando logo...' : 'Upload logo (Supabase)'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onLogoSelected(e.target.files?.[0] ?? null, setUploadingCompanyLogo, setCompanyForm, 'presentation-company-logos')} />
            </label>
            <select className="input" value={companyForm.logo_position} onChange={(e) => setCompanyForm((v) => ({ ...v, logo_position: e.target.value as PresentationEditorForm['logo_position'] }))}>
              <option value="left">Logo à esquerda</option>
              <option value="center">Logo centralizado</option>
              <option value="right">Logo à direita</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-fg/80">Largura do logo (pt)<input className="input mt-1" type="number" min={60} max={240} value={companyForm.logo_width} onChange={(e) => setCompanyForm((v) => ({ ...v, logo_width: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.logo_width }))} /></label>
            <label className="text-xs font-semibold">Cor da linha do cabeçalho<input className="input mt-1 h-10 p-1" type="color" value={companyForm.header_line_color} onChange={(e) => setCompanyForm((v) => ({ ...v, header_line_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor da linha do rodapé<input className="input mt-1 h-10 p-1" type="color" value={companyForm.footer_line_color} onChange={(e) => setCompanyForm((v) => ({ ...v, footer_line_color: e.target.value }))} /></label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-fg/80">Espessura linha cabeçalho<input className="input mt-1" type="number" min={0.2} max={4} step="0.1" value={companyForm.header_line_width} onChange={(e) => setCompanyForm((v) => ({ ...v, header_line_width: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.header_line_width }))} /></label>
            <label className="text-xs font-semibold text-fg/80">Espessura linha rodapé<input className="input mt-1" type="number" min={0.2} max={4} step="0.1" value={companyForm.footer_line_width} onChange={(e) => setCompanyForm((v) => ({ ...v, footer_line_width: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.footer_line_width }))} /></label>
            <input className="input" placeholder="Texto de rodapé" value={companyForm.footer_text} onChange={(e) => setCompanyForm((v) => ({ ...v, footer_text: e.target.value }))} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <select className="input" value={companyForm.font_family} onChange={(e) => setCompanyForm((v) => ({ ...v, font_family: e.target.value as PresentationEditorForm['font_family'] }))}>
              <option value="helvetica">Fonte Helvetica</option>
              <option value="times">Fonte Times</option>
              <option value="courier">Fonte Courier</option>
            </select>
            <label className="text-xs font-semibold text-fg/80">Tamanho corpo<input className="input mt-1" type="number" min={9} max={18} value={companyForm.body_font_size} onChange={(e) => setCompanyForm((v) => ({ ...v, body_font_size: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.body_font_size }))} /></label>
            <label className="text-xs font-semibold text-fg/80">Tamanho título<input className="input mt-1" type="number" min={14} max={40} value={companyForm.title_font_size} onChange={(e) => setCompanyForm((v) => ({ ...v, title_font_size: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.title_font_size }))} /></label>
            <label className="text-xs font-semibold text-fg/80">Tamanho subtítulo<input className="input mt-1" type="number" min={10} max={24} value={companyForm.subtitle_font_size} onChange={(e) => setCompanyForm((v) => ({ ...v, subtitle_font_size: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.subtitle_font_size }))} /></label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold">Cor do título<input className="input mt-1 h-10 p-1" type="color" value={companyForm.title_color} onChange={(e) => setCompanyForm((v) => ({ ...v, title_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor do subtítulo<input className="input mt-1 h-10 p-1" type="color" value={companyForm.subtitle_color} onChange={(e) => setCompanyForm((v) => ({ ...v, subtitle_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor da fonte (padrão: preta)<input className="input mt-1 h-10 p-1" type="color" value={companyForm.body_color} onChange={(e) => setCompanyForm((v) => ({ ...v, body_color: e.target.value }))} /></label>
          </div>

          <select className="input max-w-xs" value={companyForm.active ? 'true' : 'false'} onChange={(e) => setCompanyForm((v) => ({ ...v, active: e.target.value === 'true' }))}>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>

          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={() => setShowCompanyPreview((v) => !v)}>{showCompanyPreview ? 'Ocultar preview' : 'Preview'}</button>
            <button className="btn-secondary" type="button" onClick={exportCompanyPreviewPdf} disabled={companyPdfLoading}>{companyPdfLoading ? 'Gerando PDF...' : 'Como ficaria no PDF'}</button>
            {editingCompanyId ? <button className="btn-secondary" type="button" onClick={() => { setEditingCompanyId(null); setCompanyForm(initialCompany); setShowCompanyPreview(false); }}>Cancelar</button> : null}
            <button className="btn-primary" type="submit">{editingCompanyId ? 'Atualizar' : 'Cadastrar apresentação'}</button>
          </div>
        </form>

        {showCompanyPreview ? (
          <div className="mt-4 rounded-xl border bg-bg p-3">
            <PresentationDocumentPreview title={companyForm.title || 'Apresentação da empresa'} content={companyForm.content} layout={toLayout(companyForm)} subtitle="Apresentação institucional" />
          </div>
        ) : null}

        <div className="mt-4 card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {companyItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3">{item.active ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="btn-secondary" type="button" onClick={() => editCompany(item)}>Editar</button>
                      <button className="btn-secondary" type="button" onClick={() => removeCompany(item.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!companyItems.length ? (
                <tr>
                  <td className="px-4 py-8 text-center opacity-70" colSpan={3}>Nenhuma apresentação da empresa cadastrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}

      {showProductSection ? (
      <div className="card p-4">
        <h2 className="mb-3 text-lg font-extrabold">Apresentações de produtos</h2>
        <form className="grid gap-3" onSubmit={submitProduct}>
          <select className="input" value={productForm.product_id} onChange={(e) => setProductForm((v) => ({ ...v, product_id: e.target.value }))}>
            <option value="">Produto vinculado (opcional)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input className="input" placeholder="Título" value={productForm.title} onChange={(e) => setProductForm((v) => ({ ...v, title: e.target.value }))} />
          <textarea
            className="input min-h-[180px]"
            placeholder={'Cole seu conteúdo formatado aqui.\n\nDica: títulos/listas colados serão convertidos para estrutura do preview/PDF.'}
            value={productForm.content}
            ref={productContentRef}
            onPaste={onPasteFormatted(setProductForm)}
            onChange={(e) => setProductForm((v) => ({ ...v, content: e.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={() => justifySelectedText(productContentRef.current, setProductForm)}>
              Justificar trecho selecionado
            </button>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={productForm.justify_all} onChange={(e) => setProductForm((v) => ({ ...v, justify_all: e.target.checked }))} />
              Justificar texto completo
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input className="input" placeholder="URL do logo" value={productForm.logo_url} onChange={(e) => setProductForm((v) => ({ ...v, logo_url: e.target.value }))} />
            <label className="btn-secondary justify-center cursor-pointer">
              {uploadingProductLogo ? 'Enviando logo...' : 'Upload logo (Supabase)'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onLogoSelected(e.target.files?.[0] ?? null, setUploadingProductLogo, setProductForm, 'presentation-product-logos')} />
            </label>
            <select className="input" value={productForm.logo_position} onChange={(e) => setProductForm((v) => ({ ...v, logo_position: e.target.value as PresentationEditorForm['logo_position'] }))}>
              <option value="left">Logo à esquerda</option>
              <option value="center">Logo centralizado</option>
              <option value="right">Logo à direita</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-fg/80">Largura do logo (pt)<input className="input mt-1" type="number" min={60} max={240} value={productForm.logo_width} onChange={(e) => setProductForm((v) => ({ ...v, logo_width: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.logo_width }))} /></label>
            <label className="text-xs font-semibold">Cor da linha do cabeçalho<input className="input mt-1 h-10 p-1" type="color" value={productForm.header_line_color} onChange={(e) => setProductForm((v) => ({ ...v, header_line_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor da linha do rodapé<input className="input mt-1 h-10 p-1" type="color" value={productForm.footer_line_color} onChange={(e) => setProductForm((v) => ({ ...v, footer_line_color: e.target.value }))} /></label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-fg/80">Espessura linha cabeçalho<input className="input mt-1" type="number" min={0.2} max={4} step="0.1" value={productForm.header_line_width} onChange={(e) => setProductForm((v) => ({ ...v, header_line_width: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.header_line_width }))} /></label>
            <label className="text-xs font-semibold text-fg/80">Espessura linha rodapé<input className="input mt-1" type="number" min={0.2} max={4} step="0.1" value={productForm.footer_line_width} onChange={(e) => setProductForm((v) => ({ ...v, footer_line_width: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.footer_line_width }))} /></label>
            <label className="text-xs font-semibold text-fg/80">
              Frase do rodapé (produto)
              <input
                className="input mt-1"
                placeholder="Ex: Apresentação de produto"
                value={productForm.footer_text}
                onChange={(e) => setProductForm((v) => ({ ...v, footer_text: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <select className="input" value={productForm.font_family} onChange={(e) => setProductForm((v) => ({ ...v, font_family: e.target.value as PresentationEditorForm['font_family'] }))}>
              <option value="helvetica">Fonte Helvetica</option>
              <option value="times">Fonte Times</option>
              <option value="courier">Fonte Courier</option>
            </select>
            <label className="text-xs font-semibold text-fg/80">Tamanho corpo<input className="input mt-1" type="number" min={9} max={18} value={productForm.body_font_size} onChange={(e) => setProductForm((v) => ({ ...v, body_font_size: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.body_font_size }))} /></label>
            <label className="text-xs font-semibold text-fg/80">Tamanho título<input className="input mt-1" type="number" min={14} max={40} value={productForm.title_font_size} onChange={(e) => setProductForm((v) => ({ ...v, title_font_size: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.title_font_size }))} /></label>
            <label className="text-xs font-semibold text-fg/80">Tamanho subtítulo<input className="input mt-1" type="number" min={10} max={24} value={productForm.subtitle_font_size} onChange={(e) => setProductForm((v) => ({ ...v, subtitle_font_size: Number(e.target.value) || DEFAULT_PRESENTATION_LAYOUT.subtitle_font_size }))} /></label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold">Cor do título<input className="input mt-1 h-10 p-1" type="color" value={productForm.title_color} onChange={(e) => setProductForm((v) => ({ ...v, title_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor do subtítulo<input className="input mt-1 h-10 p-1" type="color" value={productForm.subtitle_color} onChange={(e) => setProductForm((v) => ({ ...v, subtitle_color: e.target.value }))} /></label>
            <label className="text-xs font-semibold">Cor da fonte (padrão: preta)<input className="input mt-1 h-10 p-1" type="color" value={productForm.body_color} onChange={(e) => setProductForm((v) => ({ ...v, body_color: e.target.value }))} /></label>
          </div>

          <select className="input max-w-xs" value={productForm.active ? 'true' : 'false'} onChange={(e) => setProductForm((v) => ({ ...v, active: e.target.value === 'true' }))}>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>

          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={() => setShowProductPreview((v) => !v)}>{showProductPreview ? 'Ocultar preview' : 'Preview'}</button>
            <button className="btn-secondary" type="button" onClick={exportProductPreviewPdf} disabled={productPdfLoading}>{productPdfLoading ? 'Gerando PDF...' : 'Como ficaria no PDF'}</button>
            {editingProductId ? <button className="btn-secondary" type="button" onClick={() => { setEditingProductId(null); setProductForm(initialProduct); setShowProductPreview(false); }}>Cancelar</button> : null}
            <button className="btn-primary" type="submit">{editingProductId ? 'Atualizar' : 'Cadastrar apresentação'}</button>
          </div>
        </form>

        {showProductPreview ? (
          <div className="mt-4 rounded-xl border bg-bg p-3">
            <PresentationDocumentPreview
              title={productForm.title || 'Apresentação de produto'}
              content={productForm.content}
              layout={toLayout(productForm)}
              subtitle={`Produto: ${productForm.product_id ? productNameById.get(productForm.product_id) ?? 'Produto' : 'Não vinculado'}`}
            />
          </div>
        ) : null}

        <div className="mt-4 card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {productItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3">{item.product_id ? productNameById.get(item.product_id) ?? '-' : 'Não vinculado'}</td>
                  <td className="px-4 py-3">{item.active ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="btn-secondary" type="button" onClick={() => editProduct(item)}>Editar</button>
                      <button className="btn-secondary" type="button" onClick={() => removeProduct(item.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!productItems.length ? (
                <tr>
                  <td className="px-4 py-8 text-center opacity-70" colSpan={4}>Nenhuma apresentação de produto cadastrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}
    </div>
  );
}
