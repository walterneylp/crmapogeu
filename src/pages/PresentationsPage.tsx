import { useEffect, useMemo, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { CompanyPresentation, ProductItem, ProductPresentation } from '@/lib/types';

const initialCompany = {
  title: '',
  content: '',
  active: true,
};

const initialProduct = {
  product_id: '',
  title: '',
  content: '',
  active: true,
};

export function PresentationsPage() {
  const [companyItems, setCompanyItems] = useState<CompanyPresentation[]>([]);
  const [productItems, setProductItems] = useState<ProductPresentation[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  const [companyForm, setCompanyForm] = useState(initialCompany);
  const [productForm, setProductForm] = useState(initialProduct);

  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

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

  const submitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.title.trim() || !companyForm.content.trim()) return;

    const payload = {
      title: companyForm.title.trim(),
      content: companyForm.content.trim(),
      active: companyForm.active,
    };

    const op = editingCompanyId
      ? supabase.from('company_presentations').update(payload).eq('id', editingCompanyId)
      : supabase.from('company_presentations').insert(payload);

    const { error } = await op;
    if (error) return alert(error.message);

    setEditingCompanyId(null);
    setCompanyForm(initialCompany);
    load();
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title.trim() || !productForm.content.trim()) return;

    const payload = {
      product_id: productForm.product_id || null,
      title: productForm.title.trim(),
      content: productForm.content.trim(),
      active: productForm.active,
    };

    const op = editingProductId
      ? supabase.from('product_presentations').update(payload).eq('id', editingProductId)
      : supabase.from('product_presentations').insert(payload);

    const { error } = await op;
    if (error) return alert(error.message);

    setEditingProductId(null);
    setProductForm(initialProduct);
    load();
  };

  const editCompany = (item: CompanyPresentation) => {
    setEditingCompanyId(item.id);
    setCompanyForm({ title: item.title, content: item.content, active: item.active });
  };

  const removeCompany = async (id: string) => {
    if (!window.confirm('Excluir apresentacao da empresa?')) return;
    const { error } = await supabase.from('company_presentations').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  const editProduct = (item: ProductPresentation) => {
    setEditingProductId(item.id);
    setProductForm({
      product_id: item.product_id ?? '',
      title: item.title,
      content: item.content,
      active: item.active,
    });
  };

  const removeProduct = async (id: string) => {
    if (!window.confirm('Excluir apresentacao de produto?')) return;
    const { error } = await supabase.from('product_presentations').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <div>
      <SectionTitle
        title="Apresentacoes"
        subtitle="Cadastro da apresentacao institucional e das apresentacoes por produto"
      />

      <div className="mb-4 card p-4">
        <h2 className="mb-3 text-lg font-extrabold">Apresentacao da empresa</h2>
        <form className="grid gap-3" onSubmit={submitCompany}>
          <input
            className="input"
            placeholder="Titulo"
            value={companyForm.title}
            onChange={(e) => setCompanyForm((v) => ({ ...v, title: e.target.value }))}
          />
          <textarea
            className="input min-h-[120px]"
            placeholder="Conteudo"
            value={companyForm.content}
            onChange={(e) => setCompanyForm((v) => ({ ...v, content: e.target.value }))}
          />
          <select
            className="input max-w-xs"
            value={companyForm.active ? 'true' : 'false'}
            onChange={(e) => setCompanyForm((v) => ({ ...v, active: e.target.value === 'true' }))}
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
          <div className="flex justify-end gap-2">
            {editingCompanyId ? (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditingCompanyId(null);
                  setCompanyForm(initialCompany);
                }}
              >
                Cancelar
              </button>
            ) : null}
            <button className="btn-primary" type="submit">
              {editingCompanyId ? 'Atualizar' : 'Cadastrar apresentacao'}
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          {companyItems.map((item) => (
            <div key={item.id} className="rounded-xl border bg-bg p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{item.title}</p>
                <span className="badge bg-muted">{item.active ? 'Ativo' : 'Inativo'}</span>
              </div>
              <p className="mt-1 text-sm opacity-80 whitespace-pre-wrap">{item.content}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-secondary" type="button" onClick={() => editCompany(item)}>
                  Editar
                </button>
                <button className="btn-secondary" type="button" onClick={() => removeCompany(item.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {!companyItems.length ? <p className="text-sm opacity-70">Nenhuma apresentacao da empresa cadastrada.</p> : null}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-lg font-extrabold">Apresentacoes de produtos</h2>
        <form className="grid gap-3" onSubmit={submitProduct}>
          <select
            className="input"
            value={productForm.product_id}
            onChange={(e) => setProductForm((v) => ({ ...v, product_id: e.target.value }))}
          >
            <option value="">Produto vinculado (opcional)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Titulo"
            value={productForm.title}
            onChange={(e) => setProductForm((v) => ({ ...v, title: e.target.value }))}
          />
          <textarea
            className="input min-h-[120px]"
            placeholder="Conteudo"
            value={productForm.content}
            onChange={(e) => setProductForm((v) => ({ ...v, content: e.target.value }))}
          />
          <select
            className="input max-w-xs"
            value={productForm.active ? 'true' : 'false'}
            onChange={(e) => setProductForm((v) => ({ ...v, active: e.target.value === 'true' }))}
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
          <div className="flex justify-end gap-2">
            {editingProductId ? (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  setProductForm(initialProduct);
                }}
              >
                Cancelar
              </button>
            ) : null}
            <button className="btn-primary" type="submit">
              {editingProductId ? 'Atualizar' : 'Cadastrar apresentacao'}
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          {productItems.map((item) => (
            <div key={item.id} className="rounded-xl border bg-bg p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{item.title}</p>
                <span className="badge bg-muted">{item.active ? 'Ativo' : 'Inativo'}</span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide opacity-60">
                Produto: {item.product_id ? productNameById.get(item.product_id) ?? '-' : 'Nao vinculado'}
              </p>
              <p className="mt-1 text-sm opacity-80 whitespace-pre-wrap">{item.content}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-secondary" type="button" onClick={() => editProduct(item)}>
                  Editar
                </button>
                <button className="btn-secondary" type="button" onClick={() => removeProduct(item.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {!productItems.length ? <p className="text-sm opacity-70">Nenhuma apresentacao de produto cadastrada.</p> : null}
        </div>
      </div>
    </div>
  );
}
