import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { ClientGroup, Contact, PipelineStage } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Link } from 'react-router-dom';

const initialForm = {
  name: '',
  phone: '',
  extension: '',
  email: '',
  whatsapp: '',
  company: '',
  role: '',
  source: '',
  client_group_id: '',
  current_stage_id: '',
};

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [cRes, sRes, gRes] = await Promise.all([
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
      supabase.from('pipeline_stages').select('*').order('sort_order', { ascending: true }),
      supabase.from('client_groups').select('*').order('name', { ascending: true }),
    ]);

    if (!cRes.error) setContacts((cRes.data as Contact[]) ?? []);
    if (!sRes.error) setStages((sRes.data as PipelineStage[]) ?? []);
    if (!gRes.error) setGroups((gRes.data as ClientGroup[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return contacts.filter((c) =>
      [c.name, c.company ?? '', c.email ?? '', c.whatsapp ?? ''].some((v) => v.toLowerCase().includes(q)),
    );
  }, [contacts, query]);

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [groups]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);

    const payload = {
      ...form,
      name: form.name.trim(),
      current_stage_id: form.current_stage_id || null,
      phone: form.phone || null,
      extension: form.extension || null,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
      company: form.company || null,
      role: form.role || null,
      source: form.source || null,
      client_group_id: form.client_group_id || null,
      owner_user_id: null,
    };

    const { error } = await supabase.from('contacts').insert(payload);
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }

    setOpen(false);
    setForm(initialForm);
    load();
  };

  return (
    <div>
      <SectionTitle
        title="Contatos"
        subtitle="Cadastre e acompanhe toda a base comercial em um unico lugar"
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 opacity-50" size={16} />
          <input
            className="input pl-9"
            placeholder="Buscar por nome, empresa, email ou WhatsApp"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)} type="button">
          <Plus size={16} /> Novo contato
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Grupo</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/40">
                  <td className="px-4 py-3 font-semibold">
                    <Link className="hover:underline" to={`/contacts/${c.id}`}>
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.company ?? '-'}</td>
                  <td className="px-4 py-3">{c.client_group_id ? groupNameById.get(c.client_group_id) ?? '-' : '-'}</td>
                  <td className="px-4 py-3">{c.phone ?? '-'}</td>
                  <td className="px-4 py-3">{c.whatsapp ?? '-'}</td>
                  <td className="px-4 py-3">{formatDateTime(c.created_at)}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="px-4 py-8 text-center opacity-70" colSpan={6}>
                    Nenhum contato encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/45 p-4">
          <div className="card w-full max-w-2xl p-5">
            <h2 className="mb-4 text-xl font-extrabold">Novo contato</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
              <input className="input" placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input" placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <input className="input" placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="input" placeholder="Ramal" value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} />
              <input className="input" placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              <input className="input" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="input" placeholder="Cargo" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              <input className="input" placeholder="Origem" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              <select className="input" value={form.client_group_id} onChange={(e) => setForm({ ...form, client_group_id: e.target.value })}>
                <option value="">Grupo de cliente</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select className="input md:col-span-2" value={form.current_stage_id} onChange={(e) => setForm({ ...form, current_stage_id: e.target.value })}>
                <option value="">Etapa inicial</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex justify-end gap-2 md:col-span-2">
                <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button className="btn-primary" disabled={loading} type="submit">
                  {loading ? 'Salvando...' : 'Salvar contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
