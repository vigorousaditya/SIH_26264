import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { RegisterCaseModal } from '../components/cases/RegisterCaseModal';
import { CaseDetailModal } from '../components/cases/CaseDetailModal';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import {
  FileText,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Building2,
  Clock,
  UserCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

const DEPARTMENTS = [
  'all',
  'Regulation Bureau (RB)',
  'Public Grievance Redressal Cell (PGRC)',
  'Approval Bureau (AB)',
  'Faculty Development Cell (FDC)'
];

const STATUSES = ['all', 'Pending', 'Under Process', 'Transferred', 'Escalated', 'Disposed'];
const PRIORITIES = ['all', 'Critical', 'High', 'Medium', 'Low'];

export const CaseManagementPage = () => {
  const [searchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState('receivedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      let query = `?department=${department}&status=${status}&priority=${priority}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (overdueOnly) query += `&overdue=true`;
      if (unassignedOnly) query += `&unassigned=true`;

      const res = await api.getCases(query);
      if (res.success) {
        setCases(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [department, status, priority, overdueOnly, unassignedOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCases();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartment('all');
    setStatus('all');
    setPriority('all');
    setOverdueOnly(false);
    setUnassignedOnly(false);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Client-side sorting
  const sortedCases = [...cases].sort((a, b) => {
    let factor = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'receivedAt') {
      return (new Date(a.receivedAt) - new Date(b.receivedAt)) * factor;
    }
    if (sortBy === 'expectedDisposalAt') {
      return (new Date(a.expectedDisposalAt) - new Date(b.expectedDisposalAt)) * factor;
    }
    if (sortBy === 'priority') {
      const pMap = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return ((pMap[a.priority] || 0) - (pMap[b.priority] || 0)) * factor;
    }
    return 0;
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedCases.length / rowsPerPage) || 1;
  const paginatedCases = sortedCases.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Institutional Complaint Registry"
        subtitle="Complete repository of grievances registered against technical institutions across all AICTE regions."
        badge={`${cases.length} Total`}
        breadcrumbs={[{ label: 'Operations' }, { label: 'Case Registry' }]}
        actions={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setShowRegisterModal(true)}
          >
            Register Complaint
          </Button>
        }
      />

      {/* Filter and Search Bar (Compact Standard) */}
      <div className="bg-white p-3 border border-gov-border rounded-xs shadow-card space-y-2.5">
        <div className="flex flex-col md:flex-row items-center gap-2.5 justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Case ID, institution, complainant, or facts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gov-border rounded-xs focus:ring-1 focus:ring-gov-navy focus:border-gov-navy"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            {/* Bureau Filter */}
            <select
              value={department}
              onChange={(e) => { setDepartment(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-gov-border rounded-xs px-2 py-1 font-medium text-xs"
            >
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {d === 'all' ? 'All Bureaus' : d}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-gov-border rounded-xs px-2 py-1 font-medium text-xs"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-gov-border rounded-xs px-2 py-1 font-medium text-xs"
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>
                  {p === 'all' ? 'All Priorities' : `${p} Priority`}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Quick Checkbox Toggles & Metrics Count */}
        <div className="flex items-center justify-between pt-2 border-t border-gov-borderLight text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gov-text">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => { setOverdueOnly(e.target.checked); setCurrentPage(1); }}
                className="rounded-xs text-status-overdue focus:ring-status-overdue"
              />
              <span className="text-status-overdue font-semibold">Overdue SLA Target Only</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gov-text">
              <input
                type="checkbox"
                checked={unassignedOnly}
                onChange={(e) => { setUnassignedOnly(e.target.checked); setCurrentPage(1); }}
                className="rounded-xs text-gov-saffron focus:ring-gov-saffron"
              />
              <span className="text-gov-saffron font-semibold">Unassigned Queue Only</span>
            </label>
          </div>

          <span className="text-xxs text-gov-textLight font-mono">
            Showing {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, sortedCases.length)} of {sortedCases.length} records
          </span>
        </div>
      </div>

      {/* Case Registry Table with Sticky Header */}
      <div className="bg-white border border-gov-border rounded-xs shadow-card overflow-hidden">
        {loading ? (
          <TableSkeleton columns={7} rows={rowsPerPage} />
        ) : paginatedCases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No complaints match current filters"
            description="Adjust the bureau, status, or search keywords to display matching case records."
            action={
              <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                Clear Filter Options
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left gov-table">
              <thead className="sticky top-0 bg-gov-bg z-10">
                <tr>
                  <th className="w-24">Case ID</th>
                  <th>Institution Name</th>
                  <th>Grievance Category</th>
                  <th 
                    className="w-24 cursor-pointer hover:text-gov-navy select-none"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-1">
                      Priority <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="w-36">Bureau</th>
                  <th className="w-36">Assigned Official</th>
                  <th className="w-28">Status</th>
                  <th 
                    className="w-32 cursor-pointer hover:text-gov-navy select-none"
                    onClick={() => handleSort('expectedDisposalAt')}
                  >
                    <div className="flex items-center gap-1">
                      SLA Target <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCases.map((c) => {
                  const isOverdue = c.status !== 'Disposed' && new Date(c.expectedDisposalAt).getTime() < Date.now();
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCaseId(c.id)}
                      className={`cursor-pointer ${isOverdue ? 'bg-red-50/20' : ''}`}
                    >
                      <td className="font-mono font-bold text-gov-navy whitespace-nowrap">
                        {c.id}
                        {c.issueGroupId && (
                          <span className="block text-[9px] font-mono font-normal text-teal-800 bg-teal-50 px-1 border border-teal-200 rounded-xs w-fit mt-0.5">
                            {c.issueGroupId}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold text-gov-text truncate max-w-[200px]">{c.institutionName}</div>
                        <div className="text-xxs text-gov-textLight font-mono">{c.institutionPermanentId}</div>
                      </td>
                      <td>
                        <div className="font-medium text-gov-text">{c.category}</div>
                        <div className="text-xxs text-gov-textLight truncate max-w-[220px]">{c.description}</div>
                      </td>
                      <td>
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="text-gov-textMuted font-medium text-xs">
                        {c.department}
                      </td>
                      <td>
                        {c.assignedOfficialName && c.assignedOfficialName !== 'Unassigned' ? (
                          <span className="font-semibold text-gov-text text-xs">{c.assignedOfficialName}</span>
                        ) : (
                          <span className="text-xxs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded-xs">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td>
                        <div className={`font-mono text-xs ${isOverdue ? 'text-status-overdue font-bold' : 'text-gov-textMuted'}`}>
                          {c.expectedDisposalAt ? new Date(c.expectedDisposalAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </div>
                        {isOverdue && (
                          <span className="text-[9px] font-bold text-status-overdue uppercase">
                            Overdue
                          </span>
                        )}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaseId(c.id);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Compact Pagination Bar */}
        {!loading && sortedCases.length > rowsPerPage && (
          <div className="px-4 py-2 border-t border-gov-border flex items-center justify-between text-xs bg-gov-bg">
            <span className="text-gov-textLight">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-2 py-0.5 text-xs font-mono font-medium rounded-xs border ${
                    currentPage === i + 1
                      ? 'bg-gov-navy text-white border-gov-navy'
                      : 'bg-white text-gov-text border-gov-border hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Register Complaint Modal */}
      {showRegisterModal && (
        <RegisterCaseModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onCaseRegistered={fetchCases}
        />
      )}

      {/* Case Details Modal */}
      {selectedCaseId && (
        <CaseDetailModal
          isOpen={!!selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          caseId={selectedCaseId}
          onCaseUpdated={fetchCases}
        />
      )}
    </div>
  );
};
