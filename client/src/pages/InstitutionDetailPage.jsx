import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Tabs } from '../components/common/Tabs';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { CaseDetailModal } from '../components/cases/CaseDetailModal';
import { RegisterCaseModal } from '../components/cases/RegisterCaseModal';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  FileText,
  GitMerge,
  Network,
  Clock,
  AlertTriangle,
  Plus,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

export const InstitutionDetailPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeTab, setActiveTab] = useState('cases');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getInstitution(id);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 animate-pulse rounded-xs w-64" />
        <div className="h-32 bg-white border border-gov-border rounded-xs animate-pulse" />
        <TableSkeleton columns={6} rows={5} />
      </div>
    );
  }

  const { institution, statusCounts, cases, issueGroups, relationships, alerts } = data;

  const tabList = [
    { id: 'cases', label: 'All Registered Complaints', count: cases.length, icon: FileText },
    { id: 'groups', label: 'Common Issue Groups', count: issueGroups.length, icon: GitMerge },
    { id: 'relationships', label: 'Dependency Links', count: relationships.length, icon: Network },
    { id: 'alerts', label: 'Campus Advisories', count: alerts.length, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title={institution.name}
        subtitle={`${institution.region} Region • ${institution.city}, ${institution.state}`}
        badge={institution.permanentId}
        breadcrumbs={[
          { label: 'Entities', path: '/institutions' },
          { label: 'Institutions', path: '/institutions' },
          { label: institution.name }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/institutions">
              <Button variant="secondary" size="md" icon={ArrowLeft}>
                Back to Directory
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

      {/* Institution Master Card (Structured Government Layout) */}
      <div className="bg-white p-4 border border-gov-border rounded-xs shadow-card grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Campus Info */}
        <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-gov-border pb-3 md:pb-0 md:pr-4">
          <div className="text-xxs font-bold text-gov-navy uppercase tracking-wider">
            Campus Information
          </div>
          <div>
            <span className="text-gov-textLight">AICTE Permanent ID:</span>
            <p className="font-mono font-bold text-gov-navy">{institution.permanentId}</p>
          </div>
          <div>
            <span className="text-gov-textLight">Program Classification:</span>
            <p className="font-semibold text-gov-text">{institution.category}</p>
          </div>
          <div>
            <span className="text-gov-textLight">Campus Address:</span>
            <p className="text-gov-text leading-snug">{institution.address}</p>
          </div>
        </div>

        {/* Administrative Contacts */}
        <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-gov-border pb-3 md:pb-0 md:pr-4">
          <div className="text-xxs font-bold text-gov-navy uppercase tracking-wider">
            Administrative Contacts
          </div>
          <div>
            <span className="text-gov-textLight">Principal / Director:</span>
            <p className="font-semibold text-gov-text">{institution.principalName || 'Dr. Authorized Head'}</p>
          </div>
          <div>
            <span className="text-gov-textLight">Compliance Email:</span>
            <p className="font-mono text-gov-text">{institution.contactEmail || 'compliance@aicte-institute.ac.in'}</p>
          </div>
          <div>
            <span className="text-gov-textLight">Contact Phone:</span>
            <p className="font-mono text-gov-text">{institution.contactPhone || '+91 11 23456789'}</p>
          </div>
        </div>

        {/* Grievance Metrics */}
        <div className="space-y-2 flex flex-col justify-between">
          <div className="text-xxs font-bold text-gov-navy uppercase tracking-wider">
            Grievance Redressal Status
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 border border-gov-border rounded-xs bg-gov-bg">
              <div className="text-lg font-bold font-mono text-gov-navy">{cases.length}</div>
              <div className="text-xxs text-gov-textLight">Total Cases</div>
            </div>
            <div className="p-2 border border-amber-300 rounded-xs bg-amber-50/60">
              <div className="text-lg font-bold font-mono text-status-pending">
                {(statusCounts?.Pending || 0) + (statusCounts?.['Under Process'] || 0)}
              </div>
              <div className="text-xxs text-status-pending font-semibold">Active</div>
            </div>
            <div className="p-2 border border-emerald-300 rounded-xs bg-emerald-50/60">
              <div className="text-lg font-bold font-mono text-status-disposed">{statusCounts?.Disposed || 0}</div>
              <div className="text-xxs text-status-disposed font-semibold">Disposed</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xxs text-gov-textMuted pt-1 border-t border-gov-borderLight">
            <span>Overdue Breaches: <strong className="text-status-overdue">{statusCounts?.Overdue || 0}</strong></span>
            <span>Issue Groups: <strong className="text-teal-800">{issueGroups.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabList} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content: All Complaints */}
      {activeTab === 'cases' && (
        <div className="bg-white border border-gov-border rounded-xs shadow-card overflow-hidden">
          {cases.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No complaints registered"
              description="This technical institution currently has no complaint cases on record."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left gov-table">
                <thead>
                  <tr>
                    <th className="w-24">Case ID</th>
                    <th>Category</th>
                    <th className="w-36">Bureau</th>
                    <th className="w-36">Officer</th>
                    <th className="w-20">Priority</th>
                    <th className="w-28">Status</th>
                    <th className="w-28">Target Date</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCaseId(c.id)}
                      className="cursor-pointer"
                    >
                      <td className="font-mono font-bold text-gov-navy">{c.id}</td>
                      <td>
                        <div className="font-semibold text-gov-text">{c.category}</div>
                        <div className="text-xxs text-gov-textLight truncate max-w-xs">{c.description}</div>
                      </td>
                      <td className="text-gov-textMuted">{c.department}</td>
                      <td className="text-gov-text font-medium">{c.assignedOfficialName || 'Unassigned'}</td>
                      <td><PriorityBadge priority={c.priority} /></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="font-mono text-gov-textLight text-xxs">
                        {c.expectedDisposalAt ? new Date(c.expectedDisposalAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Issue Groups */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {issueGroups.length === 0 ? (
            <div className="col-span-2">
              <EmptyState
                icon={GitMerge}
                title="No Common Issue Groups"
                description="No similar complaint clusters have been formulated for this campus."
              />
            </div>
          ) : (
            issueGroups.map((grp) => (
              <div key={grp.id} className="p-3.5 bg-white border border-teal-200 rounded-xs shadow-card space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-teal-900">{grp.id}</span>
                  <span className="text-xxs font-bold px-1.5 py-0.2 rounded-xs bg-teal-100 text-teal-800 border border-teal-200 uppercase">
                    {grp.status}
                  </span>
                </div>
                <h4 className="font-bold text-gov-text text-sm">{grp.title}</h4>
                <p className="text-gov-textMuted leading-relaxed">{grp.issueSummary}</p>
                <div className="text-xxs text-gov-textLight pt-2 border-t border-gov-border flex items-center justify-between">
                  <span>Linked Complaints: <strong className="font-mono text-gov-navy">{grp.linkedCaseIds?.join(', ')}</strong></span>
                  <span className="font-bold text-teal-800 font-mono">{grp.similarityScore}% match</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Relationships */}
      {activeTab === 'relationships' && (
        <div className="bg-white border border-gov-border rounded-xs p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-gov-border pb-2">
            <h3 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
              Cross-Case Nexus & Dependencies
            </h3>
            <Link
              to={`/impact-map?institutionId=${institution.id}`}
              className="text-xs font-semibold text-gov-navy hover:underline flex items-center gap-1"
            >
              Open Interactive Visual Graph <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {relationships.length === 0 ? (
            <p className="text-xs text-gov-textLight py-6 text-center">No mapped dependencies for this institution.</p>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel) => (
                <div key={rel.id} className="p-2.5 rounded-xs border border-gov-border bg-gov-bg flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-gov-navy">{rel.sourceCaseId}</span>
                      <span className="text-gov-textLight">↔</span>
                      <span className="font-mono font-bold text-gov-navy">{rel.targetCaseId}</span>
                      <span className="text-xxs font-bold px-1.5 py-0.2 rounded-xs bg-slate-200 text-slate-800 border border-slate-300 uppercase">
                        {rel.relationshipType}
                      </span>
                    </div>
                    <p className="text-xxs text-gov-textMuted">{rel.explanation}</p>
                  </div>
                  <span className="font-mono font-bold text-gov-navy text-xs shrink-0">
                    {rel.confidenceScore}% confidence
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Alerts */}
      {activeTab === 'alerts' && (
        <div className="bg-white border border-gov-border rounded-xs p-4 shadow-card space-y-2">
          {alerts.length === 0 ? (
            <p className="text-xs text-gov-textLight py-6 text-center">No active alerts for this campus.</p>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="p-2.5 rounded-xs border border-red-200 bg-red-50/30 flex items-start justify-between text-xs">
                <div>
                  <div className="font-bold text-red-900">{a.title}</div>
                  <p className="text-gov-textMuted mt-0.5 text-xxs leading-relaxed">{a.message}</p>
                </div>
                <span className="text-xxs font-bold px-1.5 py-0.5 rounded-xs bg-red-100 text-status-overdue border border-red-200 uppercase shrink-0">
                  {a.severity}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Case Details Modal */}
      {selectedCaseId && (
        <CaseDetailModal
          isOpen={!!selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          caseId={selectedCaseId}
          onCaseUpdated={fetchDetail}
        />
      )}

      {/* Register Complaint Modal */}
      {showRegisterModal && (
        <RegisterCaseModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onCaseRegistered={fetchDetail}
        />
      )}
    </div>
  );
};
