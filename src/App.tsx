import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { PipelinePage } from '@/pages/PipelinePage';
import { AgendaPage } from '@/pages/AgendaPage';
import { ContactDetailPage } from '@/pages/ContactDetailPage';
import { GroupsPage } from '@/pages/GroupsPage';
import { UsersPage } from '@/pages/UsersPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { QuoteModelsPage } from '@/pages/QuoteModelsPage';
import { QuotesPage } from '@/pages/QuotesPage';
import { PresentationsPage } from '@/pages/PresentationsPage';
import { AdminSettingsPage } from '@/pages/AdminSettingsPage';
import { AuditPage } from '@/pages/AuditPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { LoginPage } from '@/pages/LoginPage';
import { clearSessionUser, getSessionUser } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';

function AdminOnly({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getSessionUser());
  }, []);

  const logout = () => {
    clearSessionUser();
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage user={user} onLoggedIn={setUser} />} />
        <Route
          path="*"
          element={
            user ? (
              <Layout user={user} onLogout={logout}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/contacts/:id" element={<ContactDetailPage />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route
                    path="/users"
                    element={
                      <AdminOnly user={user}>
                        <UsersPage />
                      </AdminOnly>
                    }
                  />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/quote-models" element={<QuoteModelsPage />} />
                  <Route path="/quotes" element={<QuotesPage />} />
                  <Route path="/presentations" element={<PresentationsPage />} />
                  <Route
                    path="/admin-settings"
                    element={
                      <AdminOnly user={user}>
                        <AdminSettingsPage />
                      </AdminOnly>
                    }
                  />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route
                    path="/audit"
                    element={
                      <AdminOnly user={user}>
                        <AuditPage />
                      </AdminOnly>
                    }
                  />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/agenda" element={<AgendaPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
