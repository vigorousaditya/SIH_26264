import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { PriorityBadge } from '../components/common/Badge';
import { AssignModal } from '../components/cases/AssignModal';
import { CaseDetailModal } from '../components/cases/CaseDetailModal';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { useAlert } from '../context/AlertContext';
import { AlertOctagon, UserCheck, Eye, RefreshCw, Clock } from 'lucide-react';

export const UnassignedQueuePage = () => {
  const { showToast } = useAlert();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [viewCaseId, setViewCaseId] = useState(null);

  const fetchUnassignedCases = async () => {
    setLoading(true);
    try {
      const res = await api.getUnassignedCases();
      if (res.success) {
        setCases(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load unassigned cases queue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnassignedCases();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Unassigned Complaints Triage Queue"
        subtitle="Complaints held in administrative queue when matching bureau officials are on leave or at maximum configured capacity."
        badge={`${cases.length} Queued`}
        breadcrumbs={[{ label: 'Operations' }, { label: 'Unassigned Queue' }]}
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={RefreshCw}
            onClick={fetchUnassignedCases}
          >
            Refresh Queue
          </Button>
        }
      />

      <div className="bg-white border border-gov-border rounded-sm shadow-card overflow-hidden">
        {loading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon={AlertOctagon}
            title="Unassigned Queue is Empty"
            description="All active complaints have been successfully routed to eligible bureau officials."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left gov-table">
              <thead>
                <tr>
                  <th className="w-28">Case ID</th>
                  <th>Institution Name</th>
                  <th>Grievance Category</th>
                  <th className="w-36">Bureau</th>
                  <th className="w-24">Priority</th>
                  <th>Reason Held in Queue</th>
                  <th className="w-32">Received</th>
                  <th className="text-right w-36">Administrative Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-bold text-gov-navy">
                      <button
                        type="button"
                        onClick={() => setViewCaseId(c.id)}
                        className="hover:underline text-left"
                      >
                        {c.id}
                      </button>
                    </td>
                    <td>
                      <div className="font-semibold text-gov-text">{c.institutionName}</div>
                      <div className="text-xxs text-gov-textLight font-mono">{c.institutionPermanentId}</div>
                    </td>
                    <td>
                      <div className="font-medium text-gov-text">{c.category}</div>
                      <div className="text-xxs text-gov-textLight truncate max-w-xs">{c.description}</div>
                    </td>
                    <td className="font-medium text-gov-textMuted">
                      {c.department}
                    </td>
                    <td>
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="text-xxs text-status-pending font-medium bg-amber-50/50 p-2 border border-amber-200/60 rounded-xs">
                      {c.assignmentReason || 'No eligible officer available under limit'}
                    </td>
                    <td className="text-gov-textMuted text-xxs font-mono">
                      {c.receivedAt ? new Date(c.receivedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => setViewCaseId(c.id)}
                          title="View Case Particulars"
                        >
                          View
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={UserCheck}
                          onClick={() => setSelectedCase(c)}
                        >
                          Assign
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Assign Modal */}
      {selectedCase && (
        <AssignModal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          currentCase={selectedCase}
          onAssigned={() => {
            fetchUnassignedCases();
          }}
        />
      )}

      {/* Case Details Modal */}
      {viewCaseId && (
        <CaseDetailModal
          isOpen={!!viewCaseId}
          onClose={() => setViewCaseId(null)}
          caseId={viewCaseId}
          onCaseUpdated={fetchUnassignedCases}
        />
      )}
    </div>
  );
};
