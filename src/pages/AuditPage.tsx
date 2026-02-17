import { useEffect, useMemo, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { AuditLog } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tableFilter, setTableFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const load = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error) setLogs((data as AuditLog[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const tables = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.table_name))).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (tableFilter && log.table_name !== tableFilter) return false;
      if (actionFilter && log.action !== actionFilter) return false;
      return true;
    });
  }, [logs, tableFilter, actionFilter]);

  const summarize = (log: AuditLog) => {
    const data = log.new_data ?? log.old_data;
    if (!data || typeof data !== 'object') return '-';

    const keys = Object.keys(data).slice(0, 3);
    if (!keys.length) return '-';

    return keys
      .map((key) => `${key}: ${String((data as Record<string, unknown>)[key] ?? '-')}`)
      .join(' | ');
  };

  return (
    <div>
      <SectionTitle
        title="Auditoria"
        subtitle="Registro das operacoes realizadas no sistema"
      />

      <div className="mb-4 card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="input" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
            <option value="">Todas as tabelas</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className="input" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">Todas as acoes</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <button className="btn-secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Tabela</th>
              <th className="px-4 py-3">Acao</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Resumo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id} className="border-t align-top">
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                <td className="px-4 py-3">{log.table_name}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-muted">{log.action}</span>
                </td>
                <td className="px-4 py-3">{log.changed_by ?? '-'}</td>
                <td className="px-4 py-3">{log.record_id ?? '-'}</td>
                <td className="px-4 py-3 text-xs">{summarize(log)}</td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="px-4 py-8 text-center opacity-70" colSpan={6}>
                  Nenhum registro de auditoria encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
