import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/quote-models" element={<QuoteModelsPage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/presentations" element={<PresentationsPage />} />
          <Route path="/admin-settings" element={<AdminSettingsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
