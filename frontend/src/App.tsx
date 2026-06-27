import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./lib/auth";
import { LoginPage } from "./pages/LoginPage";

// hero screens
import { HomePage } from "./pages/HomePage";
import { ReceptionPage } from "./pages/ReceptionPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CampPage } from "./pages/CampPage";

// module pages
import { DonorsPage } from "./pages/DonorsPage";
import { BagsPage } from "./pages/BagsPage";
import { StorePage } from "./pages/StorePage";
import { QCPage } from "./pages/QCPage";
import { PipelinePage } from "./pages/PipelinePage";
import { ShiftToTestedPage } from "./pages/ShiftToTestedPage";
import { QuarantinePage } from "./pages/QuarantinePage";
import { DonorRecallPage } from "./pages/DonorRecallPage";
import { AccountingPage } from "./pages/AccountingPage";
import { InvoicePage } from "./pages/InvoicePage";
import { DirectoryPage } from "./pages/DirectoryPage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ToolsPage } from "./pages/ToolsPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { MisReportsPage, RegistersPage } from "./pages/ReportsPages";

function Protected({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted">Loading…</div>;
  if (!me) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <AppShell>{children}</AppShell>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><HomePage /></Protected>} />
      <Route path="/reception" element={<Protected><ReceptionPage /></Protected>} />
      <Route path="/reception/blood-request/invoice/:requestId" element={<Protected><InvoicePage /></Protected>} />
      <Route path="/analytics" element={<Protected><AnalyticsPage /></Protected>} />
      <Route path="/camp" element={<Protected><CampPage /></Protected>} />

      <Route path="/donors" element={<Protected><DonorsPage /></Protected>} />
      <Route path="/bags" element={<Protected><BagsPage /></Protected>} />
      <Route path="/store" element={<Protected><StorePage /></Protected>} />
      <Route path="/qc" element={<Protected><QCPage /></Protected>} />

      <Route path="/pipeline/:pipeline/:stage" element={<Protected><PipelinePage /></Protected>} />
      <Route path="/stock/shift" element={<Protected><ShiftToTestedPage /></Protected>} />
      <Route path="/quarantine" element={<Protected><QuarantinePage /></Protected>} />
      <Route path="/discard" element={<Protected><QuarantinePage /></Protected>} />

      <Route path="/donor-recall" element={<Protected><DonorRecallPage /></Protected>} />
      <Route path="/accounting" element={<Protected><AccountingPage /></Protected>} />
      <Route path="/invoices/:id" element={<Protected><InvoicePage /></Protected>} />
      <Route path="/directory" element={<Protected><DirectoryPage /></Protected>} />
      <Route path="/users" element={<Protected><UsersPage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
      <Route path="/tools" element={<Protected><ToolsPage /></Protected>} />
      <Route path="/feedback" element={<Protected><FeedbackPage /></Protected>} />
      <Route path="/reports/mis" element={<Protected><MisReportsPage /></Protected>} />
      <Route path="/reports/registers" element={<Protected><RegistersPage /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
