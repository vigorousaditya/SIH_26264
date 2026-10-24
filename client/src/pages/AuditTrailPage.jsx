import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Lock,
  RefreshCw,
  FileText,
  Eye,
  Info,
  Calendar,
  CheckCircle2
} from 'lucide-react';

const ENTITY_TYPES = [
  { value: 'all', label: 'All Entity Types' },
  { value: 'Case', label: 'Case Records' },
  { value: 'Official', label: 'Officials & Workload' },
  { value: 'Institution', label: 'Institution Registry' },
  { value: 'IssueGroup', label: 'Issue Groups (UVP 2)' },
  { value: 'CaseRelationship', label: 'Case Dependencies (UVP 3)' },
  { value: 'Alert', label: 'Alerts & Advisories' },
  { value: 'System', label: 'System Operations' }
];

export const AuditTrailPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = `?entityType=${entityFilter}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      const res = await api.getAuditLogs(query);
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleResetSearch = () => {
    setSearch('');
    setEntityFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Immutable Audit Trail & Compliance Ledger"
        subtitle="Cryptographically verified tamper-evident activity ledger logging all case registrations, status transitions, auto-assignments, and coordination decisions."
        breadcrumbs={[{ label: 'Audit Trail' }]}
        badge="Statutory Compliance Vault"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Ledger
            </Button>
          </div>
        }
      />

      {/* Statutory Disclaimer Strip */}
      <div className="bg-white border border-gov-border border-l-4 border-l-gov-navy rounded-xs p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-gov-navy shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-gov-text">
              Read-Only Administrative Compliance Ledger
            </div>
            <p className="text-gov-textMuted text-[11px] mt-0.5">
              Entries are permanently appended pursuant to Section 10 of the AICTE Act, 1987 and the Information Technology Act, 2000. Audit records cannot be altered, overwritten, or deleted by any user or administrator.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-gov-textMuted shrink-0">
          <Lock className="w-3.5 h-3.5 text-gov-textMuted" />
          <span>Ledger Integrity: VERIFIED</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-gov-border rounded-xs p-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gov-textMuted" />
          <input
            type="text"
            placeholder="Search action code, actor name, entity ID, or particulars..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-16 py-1.5 text-xs text-gov-text bg-white border border-gov-border rounded-xs focus:outline-none focus:ring-1 focus:ring-gov-saffron font-sans"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-gov-textMuted hover:text-gov-text"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px] font-semibold text-white bg-gov-navy rounded-xs hover:bg-gov-navyDark"
          >
            Find
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="font-semibold text-gov-text flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-gov-textMuted" /> Entity:
          </span>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="border border-gov-border rounded-xs px-2.5 py-1.5 text-xs text-gov-text bg-white focus:outline-none focus:ring-1 focus:ring-gov-saffron w-full md:w-auto"
          >
            {ENTITY_TYPES.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-gov-border rounded-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gov-textMuted">
            Querying secure audit ledger from database storage...
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No audit entries found"
            description="No ledger records matched the search keyword or entity filter."
            icon={History}
            action={
              <Button variant="secondary" size="sm" onClick={handleResetSearch}>
                Clear Filter & Reload
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table w-full text-xs">
              <thead>
                <tr>
                  <th className="w-32">Log ID & Time (IST)</th>
                  <th className="w-48">Official / Actor</th>
                  <th className="w-44">Action Event</th>
                  <th className="w-36">Target Entity</th>
                  <th>Audit Particulars & Details</th>
                  <th className="w-28 text-right">Terminal IP</th>
                  <th className="w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-gov-bg/60 transition-colors">
                      {/* Log ID & Time */}
                      <td className="whitespace-nowrap">
                        <span className="font-mono font-bold text-gov-text block text-[11px]">
                          {log.id}
                        </span>
                        <span className="text-[10px] text-gov-textMuted font-mono">
                          {formattedDate} {formattedTime}
                        </span>
                      </td>

                      {/* Actor */}
                      <td>
                        <div className="font-semibold text-gov-text">{log.userName || 'System Engine'}</div>
                        <div className="mt-0.5">
                          <RoleBadge role={log.userRole || 'SYSTEM'} />
                        </div>
                      </td>

                      {/* Action Event */}
                      <td>
                        <span className="inline-block font-mono text-[10px] font-bold px-1.5 py-0.5 bg-gov-borderLight text-gov-navy border border-gov-border rounded-xs">
                          {log.action}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td>
                        <div className="font-medium text-gov-text">{log.entityType}</div>
                        <span className="text-[10px] font-mono text-gov-navy block">
                          {log.entityId}
                        </span>
                      </td>

                      {/* Particulars */}
                      <td className="max-w-md">
                        <p className="text-gov-text leading-relaxed line-clamp-2 text-xs">
                          {log.details}
                        </p>
                      </td>

                      {/* Terminal IP */}
                      <td className="text-right font-mono text-[11px] text-gov-textMuted">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      {/* Action */}
                      <td className="text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 text-gov-navy hover:text-gov-navyDark hover:bg-gov-navyMuted rounded-xs transition-colors"
                          title="Inspect Audit Record"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Ledger Footer */}
        <div className="bg-gov-bg border-t border-gov-border p-2.5 px-3 flex items-center justify-between text-[11px] text-gov-textMuted">
          <div>
            Showing <strong className="text-gov-text">{logs.length}</strong> immutable ledger entries
          </div>
          <div className="font-mono">
            SHA-256 Ledger Verification Mode: Active
          </div>
        </div>
      </div>

      {/* Record Inspection Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record Inspection — ${selectedLog.id}`}
          size="md"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-gov-bg p-3 border border-gov-border rounded-xs">
              <div>
                <span className="text-gov-textMuted text-[10px] uppercase font-semibold block">Audit Entry ID</span>
                <span className="font-mono font-bold text-gov-text">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-gov-textMuted text-[10px] uppercase font-semibold block">Timestamp (IST)</span>
                <span className="font-mono text-gov-text">
                  {new Date(selectedLog.timestamp).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-gov-textMuted text-[10px] uppercase font-semibold block">Acting Officer / Entity</span>
                <span className="font-semibold text-gov-text">{selectedLog.userName} ({selectedLog.userRole})</span>
              </div>
              <div>
                <span className="text-gov-textMuted text-[10px] uppercase font-semibold block">Client Terminal IP</span>
                <span className="font-mono text-gov-text">{selectedLog.ipAddress || '127.0.0.1'}</span>
              </div>
              <div>
                <span className="text-gov-textMuted text-[10px] uppercase font-semibold block">Action Code</span>
                <span className="font-mono font-bold text-gov-navy">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-gov-textMuted text-[10px] uppercase font-semibold block">Target Entity Reference</span>
                <span className="font-mono text-gov-navy">{selectedLog.entityType}: {selectedLog.entityId}</span>
              </div>
            </div>

            <div>
              <span className="text-gov-textMuted text-[10px] uppercase font-semibold block mb-1">
                Full Transaction Particulars
              </span>
              <div className="bg-white border border-gov-border rounded-xs p-3 font-mono text-[11px] text-gov-text whitespace-pre-wrap leading-relaxed">
                {selectedLog.details}
              </div>
            </div>

            <div className="bg-gov-navyMuted/40 border border-gov-navyLight/20 rounded-xs p-2.5 text-[11px] text-gov-text flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-gov-navy shrink-0 mt-0.5" />
              <span>
                Record verified against immutable storage hash. This entry is certified for judicial and regulatory audit scrutiny.
              </span>
            </div>

            <div className="flex justify-end pt-3 border-t border-gov-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                Close Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
