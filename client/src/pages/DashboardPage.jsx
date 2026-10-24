import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { RegisterCaseModal } from '../components/cases/RegisterCaseModal';
import { CaseDetailModal } from '../components/cases/CaseDetailModal';
import { TableSkeleton } from '../components/common/Skeleton';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users2,
  GitMerge,
  Network,
  Plus,
  ArrowRight,
  ShieldAlert,
  Flame,
  Building2,
  ExternalLink,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { showToast } = useAlert();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await api.getDashboardStats();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load dashboard metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-slate-200/60 animate-pulse rounded-xs w-72 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-16 bg-white border border-gov-border rounded-xs animate-pulse p-3" />
          ))}
        </div>
        <TableSkeleton columns={6} rows={6} />
      </div>
    );
  }

  const {
    summary,
    statusDistribution,
    departmentChartData,
    timelineData,
    highPriorityAlerts,
    approachingDeadlineCases,
    officialsAtLimit,
    recentActivity
  } = data;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Institutional Grievance Monitoring & Coordination Dashboard"
        subtitle="Overview of active complaints across Regulation Bureau (RB), Public Grievance Redressal Cell (PGRC), and Approval Bureau (AB)."
        badge="Live Operational Data"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/reports">
              <Button variant="secondary" size="md" icon={Download}>
                Reports
              </Button>
            </Link>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setShowRegisterModal(true)}
            >
              Register Complaint
            </Button>
          </div>
        }
      />

      {/* Row 1: Compact Summary Tiles (Plain bordered boxes, sober NIC/GIGW standard) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* Total Cases */}
        <div className="bg-white p-3 border border-gov-border rounded-xs shadow-card">
          <div className="text-xxs font-semibold text-gov-textMuted uppercase tracking-wider">
            Total Complaints
          </div>
          <div className="text-2xl font-bold text-gov-navy mt-1 font-mono">
            {summary.totalCases}
          </div>
          <div className="text-[10px] text-gov-textLight mt-0.5">Across all bureaus</div>
        </div>

        {/* Pending Cases */}
        <div className="bg-white p-3 border border-gov-border rounded-xs shadow-card">
          <div className="text-xxs font-semibold text-status-pending uppercase tracking-wider">
            Pending Review
          </div>
          <div className="text-2xl font-bold text-status-pending mt-1 font-mono">
            {summary.pendingCases}
          </div>
          <div className="text-[10px] text-gov-textLight mt-0.5">Initial stage</div>
        </div>

        {/* Under Process */}
        <div className="bg-white p-3 border border-gov-border rounded-xs shadow-card">
          <div className="text-xxs font-semibold text-status-process uppercase tracking-wider">
            Under Process
          </div>
          <div className="text-2xl font-bold text-status-process mt-1 font-mono">
            {summary.underProcessCases}
          </div>
          <div className="text-[10px] text-gov-textLight mt-0.5">Active inquiry</div>
        </div>

        {/* Overdue (SLA Breached) */}
        <div className="bg-red-50/40 p-3 border border-red-300 rounded-xs shadow-card">
          <div className="text-xxs font-bold text-status-overdue uppercase tracking-wider flex items-center gap-1">
            <span>Overdue Cases</span>
          </div>
          <div className="text-2xl font-bold text-status-overdue mt-1 font-mono">
            {summary.overdueCases}
          </div>
          <div className="text-[10px] font-semibold text-status-overdue mt-0.5">SLA timeline breached</div>
        </div>

        {/* Transferred / Escalated */}
        <div className="bg-white p-3 border border-gov-border rounded-xs shadow-card">
          <div className="text-xxs font-semibold text-gov-textMuted uppercase tracking-wider">
            Escalated
          </div>
          <div className="text-2xl font-bold text-status-escalated mt-1 font-mono">
            {summary.escalatedCases}
          </div>
          <div className="text-[10px] text-gov-textLight mt-0.5">Apex oversight</div>
        </div>

        {/* Disposed Cases */}
        <div className="bg-white p-3 border border-gov-border rounded-xs shadow-card">
          <div className="text-xxs font-semibold text-status-disposed uppercase tracking-wider">
            Disposed / Closed
          </div>
          <div className="text-2xl font-bold text-status-disposed mt-1 font-mono">
            {summary.disposedCases}
          </div>
          <div className="text-[10px] text-gov-textLight mt-0.5">{summary.disposalRate}% disposal rate</div>
        </div>

        {/* Unassigned Queue */}
        <div className={`p-3 border rounded-xs shadow-card col-span-2 sm:col-span-1 ${
          summary.unassignedCases > 0 ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-gov-border'
        }`}>
          <div className="text-xxs font-bold text-amber-900 uppercase tracking-wider flex items-center justify-between">
            <span>Unassigned</span>
            {summary.unassignedCases > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1 font-mono">
            {summary.unassignedCases}
          </div>
          <Link to="/unassigned" className="text-[10px] text-gov-navy font-semibold hover:underline mt-0.5 block">
            Open Queue →
          </Link>
        </div>
      </div>

      {/* Row 2: Charts (Department Workload & Status Composition - Sober Muted Palette) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department Workload Bar Chart */}
        <div className="lg:col-span-2 bg-white p-4 border border-gov-border rounded-xs shadow-card">
          <div className="flex items-center justify-between border-b border-gov-border pb-2.5 mb-3">
            <div>
              <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                Bureau-wise Complaint Allocation
              </h2>
              <p className="text-xxs text-gov-textLight mt-0.5">
                Active complaints versus resolved cases across AICTE bureaus
              </p>
            </div>
            <span className="text-xxs text-gov-textLight font-mono">Active vs Disposed</span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#475569' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    borderRadius: '2px', 
                    border: '1px solid #D9DEE4', 
                    fontSize: '11px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="active" name="Active / In Progress" fill="#0B3C5D" radius={[0, 0, 0, 0]} />
                <Bar dataKey="disposed" name="Disposed / Resolved" fill="#166534" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Case Status Breakdown Donut */}
        <div className="bg-white p-4 border border-gov-border rounded-xs shadow-card flex flex-col justify-between">
          <div className="border-b border-gov-border pb-2.5 mb-2">
            <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
              Status Distribution
            </h2>
            <p className="text-xxs text-gov-textLight mt-0.5">
              Portfolio proportion by current lifecycle stage
            </p>
          </div>

          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={1}
                >
                  {statusDistribution.map((entry, index) => {
                    const colorMap = {
                      'Pending': '#D97706',
                      'Under Process': '#1E40AF',
                      'Escalated': '#991B1B',
                      'Transferred': '#475569',
                      'Disposed': '#166534'
                    };
                    return <Cell key={`cell-${index}`} fill={colorMap[entry.name] || '#64748B'} stroke="#FFFFFF" />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '2px', fontSize: '11px', border: '1px solid #D9DEE4' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Clean Muted Legend */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xxs pt-2 border-t border-gov-borderLight text-gov-textMuted font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#D97706] rounded-none shrink-0" />
              <span>Pending ({summary.pendingCases})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#1E40AF] rounded-none shrink-0" />
              <span>Under Process ({summary.underProcessCases})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#991B1B] rounded-none shrink-0" />
              <span>Escalated ({summary.escalatedCases})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#166534] rounded-none shrink-0" />
              <span>Disposed ({summary.disposedCases})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Approaching Deadlines & High Priority Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cases Approaching Deadlines */}
        <div className="bg-white border border-gov-border rounded-xs shadow-card p-4">
          <div className="flex items-center justify-between border-b border-gov-border pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gov-saffron" />
              <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                Cases Approaching SLA Target (&lt; 4 Days)
              </h2>
            </div>
            <Link to="/cases?overdue=true" className="text-xxs font-semibold text-gov-navy hover:underline">
              View All Overdue →
            </Link>
          </div>

          <div className="space-y-2">
            {approachingDeadlineCases.length === 0 ? (
              <p className="text-xs text-gov-textLight py-6 text-center">No cases approaching deadline threshold.</p>
            ) : (
              approachingDeadlineCases.map((c) => {
                const diffDays = Math.ceil((new Date(c.expectedDisposalAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className="p-2.5 rounded-xs border border-gov-border bg-gov-bg hover:bg-slate-100/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-xs font-mono font-bold text-gov-navy">{c.id}</span>
                        <StatusBadge status={c.status} />
                        <span className="text-xxs text-gov-textMuted">Assigned: {c.assignedOfficialName}</span>
                      </div>
                      <div className="text-xs text-gov-text font-medium mt-1 truncate max-w-sm">
                        {c.category} • {c.institutionName}
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-xxs font-mono font-bold px-2 py-0.5 rounded-xs bg-status-pendingBg text-status-pending border border-status-pendingBorder">
                        {diffDays > 0 ? `${diffDays} days left` : 'Overdue'}
                      </span>
                      <div className="text-[10px] text-gov-textLight mt-0.5 font-mono">
                        Target: {new Date(c.expectedDisposalAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Change-Triggered & SLA Alerts */}
        <div className="bg-white border border-gov-border rounded-xs shadow-card p-4">
          <div className="flex items-center justify-between border-b border-gov-border pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-status-overdue" />
              <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                Priority Alerts & Cross-Case Advisories
              </h2>
            </div>
            <Link to="/notifications" className="text-xxs font-semibold text-gov-navy hover:underline">
              Notification Hub →
            </Link>
          </div>

          <div className="space-y-2">
            {highPriorityAlerts.length === 0 ? (
              <p className="text-xs text-gov-textLight py-6 text-center">No unacknowledged high-priority advisories.</p>
            ) : (
              highPriorityAlerts.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className="p-2.5 rounded-xs border border-gov-border bg-gov-bg flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xxs font-bold text-gov-navy">{n.title}</span>
                      <span className="text-[9px] uppercase px-1 py-0.2 bg-white border border-gov-border font-mono text-gov-textMuted rounded-xs">
                        {n.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xxs text-gov-textMuted leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                  <Link
                    to="/notifications"
                    className="shrink-0 text-xxs font-bold text-gov-navy hover:underline self-center"
                  >
                    Action →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Officials Workload Capacity Meters & Recent Complaints Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Officials Capacity Meters */}
        <div className="bg-white border border-gov-border rounded-xs shadow-card p-4">
          <div className="flex items-center justify-between border-b border-gov-border pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-gov-navy" />
              <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                Official Capacity Meters (UVP 1)
              </h2>
            </div>
            <Link to="/workload" className="text-xxs font-semibold text-gov-navy hover:underline">
              Full Matrix →
            </Link>
          </div>

          <div className="space-y-3">
            {officialsAtLimit.map((off) => (
              <div key={off.id} className="p-2.5 border border-gov-borderLight bg-slate-50/60 rounded-xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-gov-text">{off.name}</span>
                  <span className="font-mono font-bold text-xxs text-gov-text">
                    {off.activeCases} / {off.maxCases} cases ({off.percentage}%)
                  </span>
                </div>
                <div className="text-[10px] text-gov-textLight mb-1.5">{off.department}</div>
                
                {/* Horizontal Progress Bar */}
                <div className="w-full bg-slate-200 h-2 rounded-xs overflow-hidden">
                  <div
                    className={`h-full ${
                      off.percentage >= 100 ? 'bg-status-overdue' :
                      off.percentage >= 75 ? 'bg-status-pending' : 'bg-gov-navy'
                    }`}
                    style={{ width: `${Math.min(100, off.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Cases Registry */}
        <div className="lg:col-span-2 bg-white border border-gov-border rounded-xs shadow-card p-4">
          <div className="flex items-center justify-between border-b border-gov-border pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gov-navy" />
              <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                Recent Complaint Registrations
              </h2>
            </div>
            <Link to="/cases" className="text-xxs font-semibold text-gov-navy hover:underline">
              View Complete Registry ({summary.totalCases}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left gov-table">
              <thead>
                <tr>
                  <th className="w-24">Case ID</th>
                  <th>Institution Name</th>
                  <th>Grievance Category</th>
                  <th className="w-32">Officer</th>
                  <th className="w-24">Status</th>
                  <th className="w-24">Received</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className="cursor-pointer"
                  >
                    <td className="font-mono font-bold text-gov-navy">{c.id}</td>
                    <td className="font-semibold text-gov-text truncate max-w-[170px]">{c.institutionName}</td>
                    <td className="text-gov-text truncate max-w-[160px]">{c.category}</td>
                    <td className="text-gov-textMuted">{c.assignedOfficialName || 'Unassigned'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-gov-textLight font-mono">
                      {c.receivedAt ? new Date(c.receivedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Register Complaint Modal */}
      {showRegisterModal && (
        <RegisterCaseModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onCaseRegistered={fetchStats}
        />
      )}

      {/* Case Details Modal */}
      {selectedCaseId && (
        <CaseDetailModal
          isOpen={!!selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          caseId={selectedCaseId}
          onCaseUpdated={fetchStats}
        />
      )}
    </div>
  );
};
