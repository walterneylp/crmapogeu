import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  BookOpenText,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  UserCircle2,
  Users,
  Users2,
  WalletCards,
  FileText,
  SearchCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { applyTheme, getInitialTheme } from './theme';
import { BUILD_NUMBER, BUILD_VERSION } from '@/buildInfo';
import type { SessionUser } from '@/lib/types';

interface NavItem {
  to?: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  children?: Array<{ to: string; label: string }>;
}

const nav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { to: '/contacts', label: 'Contatos', icon: <Users size={16} /> },
  { to: '/users', label: 'Usuários', icon: <UserCircle2 size={16} />, adminOnly: true },
  { to: '/groups', label: 'Grupos', icon: <Users2 size={16} /> },
  { to: '/products', label: 'Produtos', icon: <Briefcase size={16} /> },
  { to: '/quote-models', label: 'Modelos', icon: <FileText size={16} /> },
  { to: '/quotes', label: 'Orçamentos', icon: <WalletCards size={16} /> },
  {
    label: 'Apresentações',
    icon: <BookOpenText size={16} />,
    children: [
      { to: '/presentations/company', label: 'Empresa' },
      { to: '/presentations/products', label: 'Produtos' },
    ],
  },
  { to: '/pipeline', label: 'Pipeline', icon: <ClipboardList size={16} /> },
  { to: '/agenda', label: 'Agenda', icon: <ListChecks size={16} /> },
  { to: '/messages', label: 'Mensagens', icon: <MessageSquare size={16} /> },
  { to: '/admin-settings', label: 'Admin', icon: <Settings size={16} />, adminOnly: true },
  { to: '/audit', label: 'Auditoria', icon: <SearchCheck size={16} />, adminOnly: true },
];

export function Layout({
  children,
  user,
  onLogout,
}: {
  children: React.ReactNode;
  user: SessionUser;
  onLogout: () => void;
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
  };

  const visibleNav = nav.filter((item) => !item.adminOnly || user.role === 'admin');

  return (
    <div className="min-h-screen md:flex">
      <aside
        className={`fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all md:sticky md:block ${
          mobileOpen ? 'w-72' : 'w-0 overflow-hidden md:w-auto md:overflow-visible'
        } ${collapsed ? 'md:w-20' : 'md:w-72'}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-4">
            <Link to="/" className="font-extrabold tracking-tight">
              {collapsed ? 'CO' : 'Comercial OS'}
            </Link>
            <button className="btn-secondary hidden md:inline-flex" type="button" onClick={() => setCollapsed((v) => !v)}>
              <Menu size={14} />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {visibleNav.map((item) => (
              item.to ? (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold ${
                      isActive ? 'bg-muted' : 'hover:bg-muted'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {!collapsed ? <span>{item.label}</span> : null}
                </NavLink>
              ) : (
                <div key={item.label}>
                  <NavLink
                    to={item.children?.[0]?.to || '/'}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold ${
                      item.children?.some((child) => location.pathname.startsWith(child.to)) ? 'bg-muted' : 'hover:bg-muted'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {!collapsed ? <span>{item.label}</span> : null}
                  </NavLink>
                  {!collapsed && item.children?.length ? (
                    <div className="mt-1 space-y-1 pl-8">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            `block rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-muted' : 'hover:bg-muted'}`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            ))}
          </nav>
          <div className="border-t p-3">
            <button className="btn-secondary w-full justify-center" onClick={toggleTheme} type="button" aria-label="Tema">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              {!collapsed ? (theme === 'light' ? 'Escuro' : 'Claro') : null}
            </button>
            {!collapsed ? (
              <div className="mt-3 rounded-xl border bg-bg px-3 py-2 text-[11px] leading-4 opacity-75">
                <p>Versão: {BUILD_VERSION}</p>
                <p>Build: {BUILD_NUMBER}</p>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b bg-bg/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <button className="btn-secondary md:hidden" type="button" onClick={() => setMobileOpen(true)}>
              <Menu size={16} /> Menu
            </button>
            <div className="hidden md:block text-sm opacity-70">Operação Comercial</div>
            <div className="flex items-center gap-2">
              <Link className="btn-secondary" to="/messages">
                <Bell size={16} /> Alertas
              </Link>
              <button className="btn-secondary" type="button" onClick={onLogout}>
                <UserCircle2 size={16} /> Sair ({user.login})
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
