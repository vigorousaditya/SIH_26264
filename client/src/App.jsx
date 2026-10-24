import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';

// Components
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InstitutionDirectoryPage } from './pages/InstitutionDirectoryPage';
import { InstitutionDetailPage } from './pages/InstitutionDetailPage';
import { CaseManagementPage } from './pages/CaseManagementPage';
import { WorkloadPage } from './pages/WorkloadPage';
import { SimilarGroupingPage } from './pages/SimilarGroupingPage';
import { ImpactMapPage } from './pages/ImpactMapPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { UnassignedQueuePage } from './pages/UnassignedQueuePage';

// Protected App Layout
const AppLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gov-bg text-gov-textMuted text-xs">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-gov-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold text-gov-navy">Connecting to AICTE CaseBridge Central Database...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gov-bg overflow-hidden font-sans text-gov-text text-base relative">
      {/* Off-canvas mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Navigation Sidebar (Drawer on mobile, fixed left rail on md+) */}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Government Header Strip with Mobile Hamburger */}
        <Navbar
          mobileNavOpen={mobileNavOpen}
          onToggleMenu={() => setMobileNavOpen(!mobileNavOpen)}
        />

        {/* Dynamic Page Outlet with Government Padding */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gov-bg">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Slim Government Standard Footer */}
        <footer className="bg-white border-t border-gov-border px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xxs text-gov-textLight select-none shrink-0 py-1.5 sm:py-0 sm:h-7 no-print text-center sm:text-left gap-0.5">
          <div>
            AICTE CaseBridge Portal • Smart India Hackathon 2026 (SIH26264) • Fictional Demo Data
          </div>
          <div className="font-mono">
            Version 1.2.0 • For Official Use Only
          </div>
        </footer>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <AlertProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="cases" element={<CaseManagementPage />} />
              <Route path="unassigned" element={<UnassignedQueuePage />} />
              <Route path="similarity" element={<SimilarGroupingPage />} />
              <Route path="impact-map" element={<ImpactMapPage />} />
              <Route path="institutions" element={<InstitutionDirectoryPage />} />
              <Route path="institutions/:id" element={<InstitutionDetailPage />} />
              <Route path="workload" element={<WorkloadPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit" element={<AuditTrailPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AlertProvider>
    </AuthProvider>
  );
};

export default App;
