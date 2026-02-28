import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoleManagementPage from './pages/RoleManagementPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import CustomReportsPage from './pages/CustomReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import SearchPage from './pages/SearchPage';
import WebhooksPage from './pages/WebhooksPage';
import RecommendationsPage from './pages/RecommendationsPage';
import AgentConsolePage from './pages/AgentConsolePage';
import AdvancedCompliancePage from './pages/AdvancedCompliancePage';
import IntelligenceMapPage from './pages/IntelligenceMapPage';
import SystemHealthPage from './pages/SystemHealthPage';
import UseCasesPage from './pages/UseCasesPage';
import CertificationsPage from './pages/CertificationsPage';
import DeploymentsPage from './pages/DeploymentsPage';
import NotFoundPage from './pages/NotFoundPage';
import { useRouteFocus } from './hooks/useRouteFocus';

function App() {
  // Move focus to h1 heading after every client-side navigation
  useRouteFocus();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<IntelligenceMapPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="admin/roles" element={<RoleManagementPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/custom" element={<CustomReportsPage />} />
        <Route path="webhooks" element={<WebhooksPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="agents" element={<AgentConsolePage />} />
        <Route path="taxonomy" element={<AdvancedCompliancePage />} />
        <Route path="compliance" element={<Navigate to="/taxonomy" replace />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="use-cases" element={<UseCasesPage />} />
        <Route path="certifications" element={<CertificationsPage />} />
        <Route path="deployments" element={<DeploymentsPage />} />
        <Route path="system-health" element={<SystemHealthPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
