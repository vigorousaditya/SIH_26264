import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { CaseDetailModal } from '../components/cases/CaseDetailModal';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import {
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  GitMerge,
  Network,
  Users2,
  Filter,
  CheckCheck,
  ExternalLink,
  Info
} from 'lucide-react';

const SEVERITIES = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const TYPES = [
  { value: 'all', label: 'All Alert Classifications' },
  { value: 'OVERDUE_ALERT', label: 'SLA Breach (Overdue)' },
  { value: 'DEADLINE_NEARING', label: 'Deadline Approaching' },
  { value: 'UNASSIGNED_CASE', label: 'Unassigned Case in Queue' },
  { value: 'WORKLOAD_LIMIT', label: 'Official Capacity Ceiling' },
  { value: 'SIMILAR_COMPLAINTS', label: 'Similar Grievance Detected' },
  { value: 'IMPACT_ALERT', label: 'Cross-Case Impact Advisory' },
  { value: 'ASSIGNMENT', label: 'Case Assignment Notice' },
  { value: 'ESCALATION', label: 'Administrative Escalation' }
];

export const NotificationsPage = () => {
  const { user } = useAuth();
  const { showToast, refreshNotifications } = useAlert();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Modals
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [acknowledgingNotif, setAcknowledgingNotif] = useState(null);
  const [ackRemarks, setAckRemarks] = useState('');
  const [submittingAck, setSubmittingAck] = useState(false);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      let query = `?severity=${severityFilter}&type=${typeFilter}`;
      if (unreadOnly) query += '&unreadOnly=true';

      const res = await api.getNotifications(query);
      if (res && res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [severityFilter, typeFilter, unreadOnly]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifs();
      refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      showToast('All notifications marked as read.', 'success');
      fetchNotifs();
      refreshNotifications();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAcknowledgeSubmit = async (e) => {
    e.preventDefault();
    if (!acknowledgingNotif) return;

    setSubmittingAck(true);
    try {
      const res = await api.acknowledgeNotification(acknowledgingNotif.id, ackRemarks);
      if (res.success) {
        showToast('Advisory acknowledged and administrative response recorded in compliance ledger.', 'success');
        setAcknowledgingNotif(null);
        setAckRemarks('');
        fetchNotifs();
        refreshNotifications();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAck(false);
    }
  };

  const notifList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notifList.filter(n => !n.read).length;
  const criticalCount = notifList.filter(n => n.severity === 'critical').length;
  const unackCount = notifList.filter(n => !n.acknowledged).length;

  return (
    <div className="space-y-4">
      {/* Government Page Header */}
      <PageHeader
        title="Alert & Coordination Advisory Hub"
        subtitle="Operational alerts, SLA breach warnings, cross-case impact advisories, and workload limits across AICTE bureaus."
        breadcrumbs={[{ label: 'Alerts & Advisories' }]}
        badge={`${notifList.length} Total Notices`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={loading || unreadCount === 0}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1 text-gov-textMuted" />
            Mark All as Read
          </Button>
        }
      />

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gov-border rounded-xs p-3">
          <div className="text-[11px] font-semibold text-gov-textMuted uppercase tracking-wider">Total Notices</div>
          <div className="text-xl font-bold text-gov-text mt-1">{notifList.length}</div>
          <div className="text-[11px] text-gov-textMuted mt-0.5">In current view</div>
        </div>
        <div className="bg-white border border-gov-border border-l-4 border-l-status-overdue rounded-xs p-3">
          <div className="text-[11px] font-semibold text-status-overdue uppercase tracking-wider">Critical / SLA Breach</div>
          <div className="text-xl font-bold text-status-overdue mt-1">{criticalCount}</div>
          <div className="text-[11px] text-status-overdue mt-0.5">Requires urgent action</div>
        </div>
        <div className="bg-white border border-gov-border border-l-4 border-l-status-pending rounded-xs p-3">
          <div className="text-[11px] font-semibold text-status-pending uppercase tracking-wider">Pending Acknowledgment</div>
          <div className="text-xl font-bold text-gov-text mt-1">{unackCount}</div>
          <div className="text-[11px] text-gov-textMuted mt-0.5">Awaiting official remarks</div>
        </div>
        <div className="bg-white border border-gov-border rounded-xs p-3">
          <div className="text-[11px] font-semibold text-gov-textMuted uppercase tracking-wider">Unread Notices</div>
          <div className="text-xl font-bold text-gov-navy mt-1">{unreadCount}</div>
          <div className="text-[11px] text-gov-textMuted mt-0.5">Unreviewed by official</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-gov-border rounded-xs p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gov-text flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gov-textMuted" /> Filter Notices:
          </span>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-gov-border rounded-xs px-2.5 py-1.5 text-xs text-gov-text bg-white focus:outline-none focus:ring-1 focus:ring-gov-saffron"
          >
            {SEVERITIES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gov-border rounded-xs px-2.5 py-1.5 text-xs text-gov-text bg-white focus:outline-none focus:ring-1 focus:ring-gov-saffron"
          >
            {TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gov-text select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded-xs border-gov-border text-gov-saffron focus:ring-gov-saffron"
          />
          <span>Show Unread Only</span>
        </label>
      </div>

      {/* Notices List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="bg-white border border-gov-border rounded-xs p-8 text-center text-xs text-gov-textMuted">
            Retrieving official notices from coordination ledger...
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No advisory notices found"
            description="There are currently no active alerts matching your selected severity and category filters."
            icon={BellRing}
          />
        ) : (
          notifications.map((n) => {
            const isCritical = n.severity === 'critical';
            const isHigh = n.severity === 'high';
            const isOverdue = n.type === 'OVERDUE_ALERT';
            const isImpact = n.type === 'IMPACT_ALERT';

            let leftBorderClass = 'border-l-4 border-l-gov-border';
            if (isCritical || isOverdue) {
              leftBorderClass = 'border-l-4 border-l-status-overdue bg-status-overdueBg/10';
            } else if (isHigh || n.type === 'WORKLOAD_LIMIT') {
              leftBorderClass = 'border-l-4 border-l-status-pending bg-status-pendingBg/10';
            } else if (isImpact) {
              leftBorderClass = 'border-l-4 border-l-gov-navyLight bg-gov-navyMuted/30';
            }

            return (
              <div
                key={n.id}
                className={`bg-white border border-gov-border rounded-xs p-3.5 transition-colors ${leftBorderClass} ${
                  !n.read ? 'ring-1 ring-gov-navy/20' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {/* Header line */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-gov-text">
                        {n.title}
                      </span>

                      {/* Severity pill */}
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-xs border ${
                        n.severity === 'critical'
                          ? 'bg-status-overdueBg text-status-overdue border-status-overdueBorder'
                          : n.severity === 'high'
                          ? 'bg-status-pendingBg text-status-pending border-status-pendingBorder'
                          : 'bg-status-processBg text-status-process border-status-processBorder'
                      }`}>
                        {n.severity}
                      </span>

                      {/* Type tag */}
                      <span className="text-[10px] font-mono text-gov-textMuted bg-gov-borderLight px-1.5 py-0.5 rounded-xs border border-gov-border">
                        {n.type}
                      </span>

                      <span className="text-[11px] text-gov-textMuted font-mono ml-auto md:ml-0">
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Recent'}
                      </span>

                      {!n.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-gov-saffron" title="Unread Notice" />
                      )}
                    </div>

                    {/* Notice Message */}
                    <p className="text-xs text-gov-text leading-relaxed">
                      {n.message}
                    </p>

                    {/* Acknowledgment Stamp */}
                    {n.acknowledged && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-status-disposedBg text-status-disposed border border-status-disposedBorder text-[11px] font-medium">
                        <CheckCircle2 className="w-3 h-3 text-status-disposed" />
                        <span>Acknowledged by <strong>{n.acknowledgedBy || 'Official'}</strong> on {n.acknowledgedAt ? new Date(n.acknowledgedAt).toLocaleString('en-IN') : 'Confirmed'}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gov-borderLight justify-end">
                    {n.relatedCaseId && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setSelectedCaseId(n.relatedCaseId)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1 text-gov-navy" />
                        Case {n.relatedCaseId}
                      </Button>
                    )}

                    {!n.acknowledged && (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => setAcknowledgingNotif(n)}
                      >
                        Acknowledge
                      </Button>
                    )}

                    {!n.read && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="px-2 py-1 text-[11px] text-gov-textMuted hover:text-gov-text hover:bg-gov-bg rounded-xs border border-gov-border"
                        title="Mark Notice as Read"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Acknowledge Alert Modal */}
      {acknowledgingNotif && (
        <Modal
          isOpen={!!acknowledgingNotif}
          onClose={() => setAcknowledgingNotif(null)}
          title="Acknowledge Alert & Record Coordination Decision"
          size="md"
        >
          <form onSubmit={handleAcknowledgeSubmit} className="space-y-4 text-xs">
            <div className="bg-gov-bg border border-gov-border rounded-xs p-3 space-y-1">
              <div className="font-semibold text-gov-text">{acknowledgingNotif.title}</div>
              <p className="text-gov-textMuted text-xs">{acknowledgingNotif.message}</p>
            </div>

            <FormField
              label="Coordination Remarks & Action Taken"
              required
              helpText="Document administrative decision, communication with peer bureau, or inspection scheduling. Logged into immutable audit trail."
            >
              <textarea
                rows={4}
                placeholder="e.g., Reviewed file with Regulation Bureau officer. Joint inspection planned for 28 Oct. Hearing notice prepared."
                value={ackRemarks}
                onChange={(e) => setAckRemarks(e.target.value)}
                className="w-full bg-white border border-gov-border rounded-xs p-2.5 text-xs text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-saffron font-sans"
                required
              />
            </FormField>

            <div className="bg-status-pendingBg/40 border border-status-pendingBorder rounded-xs p-2.5 text-[11px] text-gov-text flex items-start gap-2">
              <Info className="w-4 h-4 text-status-pending shrink-0 mt-0.5" />
              <span>
                Under AICTE grievance governance guidelines, acknowledging this alert formally confirms official awareness and establishes accountability.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAcknowledgingNotif(null)}
                disabled={submittingAck}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submittingAck || !ackRemarks.trim()}
              >
                {submittingAck ? 'Recording in Ledger...' : 'Submit Official Acknowledgment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Case Details Modal */}
      {selectedCaseId && (
        <CaseDetailModal
          isOpen={!!selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          caseId={selectedCaseId}
          onCaseUpdated={fetchNotifs}
        />
      )}
    </div>
  );
};
