import { useEffect, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { AdminSetting } from '@/lib/types';

const initialForm = {
  key: '',
  value: '{\n  "enabled": true\n}',
  description: '',
};

export function AdminSettingsPage() {
  const [items, setItems] = useState<AdminSetting[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('admin_settings').select('*').order('key', { ascending: true });
    if (!error) setItems((data as AdminSetting[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.key.trim()) return;

    let parsedValue: Record<string, unknown> | null = null;
    try {
      parsedValue = form.value.trim() ? (JSON.parse(form.value) as Record<string, unknown>) : null;
    } catch {
      alert('Valor JSON invalido.');
      return;
    }

    const payload = {
      key: form.key.trim(),
      value: parsedValue,
      description: form.description.trim() || null,
    };

    const op = editingId
      ? supabase.from('admin_settings').update(payload).eq('id', editingId)
      : supabase.from('admin_settings').insert(payload);

    const { error } = await op;
    if (error) return alert(error.message);

    setEditingId(null);
    setForm(initialForm);
    load();
  };

  const edit = (item: AdminSetting) => {
    setEditingId(item.id);
    setForm({
      key: item.key,
      value: JSON.stringify(item.value ?? {}, null, 2),
      description: item.description ?? '',
    });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Excluir configuracao?')) return;
    const { error } = await supabase.from('admin_settings').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <div>
      <SectionTitle
        title="Configuracoes do Admin"
        subtitle="Webhook de e-mail, webhook de WhatsApp, e-mails de origem e demais parametros"
      />

      <div className="mb-4 card p-4">
        <form className="grid gap-3" onSubmit={submit}>
          <input
            className="input"
            placeholder="Chave (ex: webhook_email, webhook_whatsapp, emails_origem)"
            value={form.key}
            onChange={(e) => setForm((v) => ({ ...v, key: e.target.value }))}
          />
          <textarea
            className="input min-h-[120px]"
            placeholder="Valor JSON"
            value={form.value}
            onChange={(e) => setForm((v) => ({ ...v, value: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Descricao"
            value={form.description}
            onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            {editingId ? (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
              >
                Cancelar
              </button>
            ) : null}
            <button className="btn-primary" type="submit">
              {editingId ? 'Atualizar' : 'Salvar configuracao'}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-4 py-3">Chave</th>
              <th className="px-4 py-3">Descricao</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t align-top">
                <td className="px-4 py-3 font-semibold">{item.key}</td>
                <td className="px-4 py-3">{item.description ?? '-'}</td>
                <td className="px-4 py-3">
                  <pre className="max-w-xl overflow-auto text-xs">{JSON.stringify(item.value ?? {}, null, 2)}</pre>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="btn-secondary" type="button" onClick={() => edit(item)}>
                      Editar
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => remove(item.id)}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td className="px-4 py-8 text-center opacity-70" colSpan={4}>
                  Nenhuma configuracao cadastrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
