import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import {
  BarChart3,
  Download,
  Calendar,
  Building2,
  PieChart as PieIcon,
  TrendingUp,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Layers
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

// Government restrained palette (No neon, no purple)
const GOV_CHART_COLORS = [
  '#0B3C5D', // Deep Navy
  '#164E72', // Slate Navy
  '#0F766E', // Forest Teal
  '#334155', // Slate Grey
  '#D97706', // Saffron / Amber
  '#B45309', // Dark Saffron
  '#991B1B', // Crimson
  '#475569'  // Muted Slate
];

export const ReportsPage = () => {
  const { user } = useAuth();
  const { showToast } = useAlert();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedBureau, setSelectedBureau] = useState('all');
  const [timePeriod, setTimePeriod] = useState('AY_2026_27');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalyticsDetailed();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.exportCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AICTE_CaseBridge_Registry_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Master grievance registry exported successfully to CSV.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-white border border-gov-border rounded-xs p-12 text-center text-xs text-gov-textMuted">
        Compiling organizational reports and statistical metrics from AICTE case registry...
      </div>
    );
  }

  const { regionData, categoryData, officialWorkloads } = data;

  // Filtered views
  const filteredRegionData = selectedRegion === 'all'
    ? regionData
    : regionData.filter(r => r.region.toLowerCase().includes(selectedRegion.toLowerCase()));

  const totalComplaints = regionData.reduce((acc, curr) => acc + (curr.cases || 0), 0);
  const topRegion = [...regionData].sort((a, b) => b.cases - a.cases)[0];
  const topCategory = categoryData[0];
  const avgUtilization = Math.round(
    officialWorkloads.reduce((acc, curr) => acc + curr.utilization, 0) / (officialWorkloads.length || 1)
  );

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Executive Reports & Statistical Bulletins"
        subtitle="Institutional grievance metrics, regional caseload distribution, violation category breakdown, and official workload utilization compiled from live AICTE registry records."
        breadcrumbs={[{ label: 'Executive Reports' }]}
        badge="Official Gazette Format"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {exporting ? 'Generating CSV...' : 'Export Complete Registry (CSV)'}
          </Button>
        }
      />

      {/* KPI Tiles Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gov-border rounded-xs p-3">
          <div className="text-[11px] font-semibold text-gov-textMuted uppercase tracking-wider">
            Total Logged Complaints
          </div>
          <div className="text-xl font-bold text-gov-text mt-1">
            {totalComplaints}
          </div>
          <div className="text-[11px] text-gov-textMuted mt-0.5">Across all 8 regional offices</div>
        </div>

        <div className="bg-white border border-gov-border rounded-xs p-3">
          <div className="text-[11px] font-semibold text-gov-textMuted uppercase tracking-wider">
            Highest Caseload Zone
          </div>
          <div className="text-xl font-bold text-gov-navy mt-1 truncate">
            {topRegion ? topRegion.region : 'N/A'}
          </div>
          <div className="text-[11px] text-gov-textMuted mt-0.5">
            {topRegion ? `${topRegion.cases} complaints logged` : ''}
          </div>
        </div>

        <div className="bg-white border border-gov-border rounded-xs p-3">
          <div className="text-[11px] font-semibold text-gov-textMuted uppercase tracking-wider">
            Predominant Violation
          </div>
          <div className="text-xl font-bold text-gov-saffronHover mt-1 truncate">
            {topCategory ? topCategory.category : 'N/A'}
          </div>
          <div className="text-[11px] text-gov-textMuted mt-0.5">
            {topCategory ? `${topCategory.count} complaints (${Math.round((topCategory.count / (totalComplaints || 1)) * 100)}% of total)` : ''}
          </div>
        </div>

        <div className="bg-white border border-gov-border rounded-xs p-3">
          <div className="text-[11px] font-semibold text-gov-textMuted uppercase tracking-wider">
            Mean Official Workload
          </div>
          <div className="text-xl font-bold text-gov-text mt-1">
            {avgUtilization}%
          </div>
          <div className="text-[11px] text-gov-textMuted mt-0.5">Active capacity ceiling</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gov-border rounded-xs p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gov-text flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gov-textMuted" /> Report Scope:
          </span>

          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="border border-gov-border rounded-xs px-2.5 py-1.5 text-xs text-gov-text bg-white focus:outline-none focus:ring-1 focus:ring-gov-saffron"
          >
            <option value="AY_2026_27">Academic Year 2026–27 (Current)</option>
            <option value="Q2_2026">Q2 FY 2026–27 (Jul–Sep 2026)</option>
            <option value="ALL">All Recorded Fiscal Periods</option>
          </select>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="border border-gov-border rounded-xs px-2.5 py-1.5 text-xs text-gov-text bg-white focus:outline-none focus:ring-1 focus:ring-gov-saffron"
          >
            <option value="all">All Regional Offices (Zones)</option>
            {regionData.map(r => (
              <option key={r.region} value={r.region}>{r.region}</option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-gov-textMuted font-mono">
          Last Synchronized: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
        </div>
      </div>

      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Regional Grievance Distribution */}
        <div className="bg-white border border-gov-border rounded-xs p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gov-borderLight">
            <div>
              <h3 className="text-xs font-bold text-gov-text uppercase tracking-wider">
                Regional Caseload Distribution
              </h3>
              <p className="text-[11px] text-gov-textMuted">
                Total complaints registered across AICTE zonal jurisdictions
              </p>
            </div>
            <Building2 className="w-4 h-4 text-gov-navy" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredRegionData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#EDF1F5" vertical={false} />
                <XAxis
                  dataKey="region"
                  tick={{ fontSize: 10, fill: '#475569' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B3C5D',
                    borderColor: '#07243A',
                    color: '#ffffff',
                    borderRadius: '2px',
                    fontSize: '11px',
                    padding: '6px 10px'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Bar
                  dataKey="cases"
                  name="Total Complaints"
                  fill="#0B3C5D"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Violation Categories */}
        <div className="bg-white border border-gov-border rounded-xs p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gov-borderLight">
            <div>
              <h3 className="text-xs font-bold text-gov-text uppercase tracking-wider">
                Grievance Classification Breakdown
              </h3>
              <p className="text-[11px] text-gov-textMuted">
                Top categories of non-compliance and statutory violations
              </p>
            </div>
            <PieIcon className="w-4 h-4 text-gov-navy" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.slice(0, 6)}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {categoryData.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GOV_CHART_COLORS[index % GOV_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B3C5D',
                    borderColor: '#07243A',
                    color: '#ffffff',
                    borderRadius: '2px',
                    fontSize: '11px',
                    padding: '6px 10px'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#1E293B', paddingTop: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Official Workload Capacity Utilization */}
      <div className="bg-white border border-gov-border rounded-xs p-4">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gov-borderLight">
          <div>
            <h3 className="text-xs font-bold text-gov-text uppercase tracking-wider">
              Official Workload Capacity Utilization (%)
            </h3>
            <p className="text-[11px] text-gov-textMuted">
              Current active caseload vs. authorized statutory ceiling per bureau officer
            </p>
          </div>
          <TrendingUp className="w-4 h-4 text-gov-navy" />
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={officialWorkloads} margin={{ top: 10, right: 10, left: -10, bottom: 35 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#EDF1F5" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#475569' }}
                interval={0}
                angle={-30}
                textAnchor="end"
              />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: '#475569' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B3C5D',
                  borderColor: '#07243A',
                  color: '#ffffff',
                  borderRadius: '2px',
                  fontSize: '11px',
                  padding: '6px 10px'
                }}
                itemStyle={{ color: '#ffffff' }}
                formatter={(value, name, props) => [
                  `${value}% (${props.payload.active}/${props.payload.limit} cases)`,
                  'Capacity Utilization'
                ]}
              />
              <Bar dataKey="utilization" name="Workload %" radius={[2, 2, 0, 0]}>
                {officialWorkloads.map((entry, index) => {
                  let barColor = '#0B3C5D'; // Normal
                  if (entry.utilization >= 100) {
                    barColor = '#991B1B'; // Over capacity (Red)
                  } else if (entry.utilization >= 75) {
                    barColor = '#D97706'; // Nearing capacity (Amber)
                  }
                  return <Cell key={`cell-${index}`} fill={barColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Zonal & Category Statistical Registry Table */}
      <div className="bg-white border border-gov-border rounded-xs overflow-hidden">
        <div className="bg-gov-bg border-b border-gov-border p-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-gov-text uppercase tracking-wider">
              Zonal Caseload Breakdown & Audit Roster
            </h3>
            <p className="text-[11px] text-gov-textMuted">
              Verified count of active institutions and grievance cases per jurisdiction
            </p>
          </div>
          <span className="text-[11px] font-mono text-gov-textMuted">
            8 Regional Offices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="gov-table w-full text-xs">
            <thead>
              <tr>
                <th className="w-12 text-center">S.No.</th>
                <th>Regional Zone</th>
                <th className="text-right">Institutions in Registry</th>
                <th className="text-right">Complaints Logged</th>
                <th className="text-right">National Caseload Share</th>
                <th>Coordination Status</th>
              </tr>
            </thead>
            <tbody>
              {regionData.map((r, idx) => {
                const share = totalComplaints > 0 ? Math.round((r.cases / totalComplaints) * 100) : 0;
                return (
                  <tr key={r.region}>
                    <td className="text-center font-mono text-gov-textMuted">{idx + 1}</td>
                    <td className="font-semibold text-gov-text">{r.region}</td>
                    <td className="text-right font-mono">{r.institutions}</td>
                    <td className="text-right font-mono font-bold text-gov-navy">{r.cases}</td>
                    <td className="text-right font-mono">
                      <div className="flex items-center justify-end gap-2">
                        <span>{share}%</span>
                        <div className="w-16 bg-gov-borderLight h-1.5 rounded-xs overflow-hidden">
                          <div
                            className="bg-gov-navy h-full"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-disposed">
                        <CheckCircle2 className="w-3 h-3 text-status-disposed" />
                        Synchronized
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
