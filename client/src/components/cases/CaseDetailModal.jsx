import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { StatusUpdateModal } from './StatusUpdateModal';
import { AssignModal } from './AssignModal';
import { api } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { 
  Building2, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  FileText, 
  History, 
  Edit3, 
  UserCheck, 
  ExternalLink,
  Printer,
  GitMerge,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CaseDetailModal = ({ isOpen, onClose, caseId, onCaseUpdated }) => {
  const { showToast } = useAlert();
  const [caseData, setCaseData] = useState(null);
  const [history, setHistory] = useState([]);
  const [issueGroup, setIssueGroup] = useState(null);
  const [similarCases, setSimilarCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submodals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [submittingRemark, setSubmittingRemark] = useState(false);

  useEffect(() => {
    if (isOpen && caseId) {
      loadCaseDetails();
    }
  }, [isOpen, caseId]);

  const loadCaseDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getCase(caseId);
      if (res.success) {
        setCaseData(res.data);
        setHistory(res.history || []);
        setIssueGroup(res.issueGroup);
        setSimilarCases(res.similarCases || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load case details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkSubmit = async (e) => {
    e.preventDefault();
    if (!newRemark.trim()) return;

    setSubmittingRemark(true);
    try {
      await api.addCaseRemarks(caseId, { remarks: newRemark.trim() });
      setNewRemark('');
      showToast('Action note appended to case history.', 'success');
      await loadCaseDetails();
      if (onCaseUpdated) onCaseUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingRemark(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={caseData ? `Complaint Case File: ${caseData.id}` : 'Loading Case...'}
        subtitle={caseData ? `${caseData.institutionName} (${caseData.institutionPermanentId})` : ''}
        maxWidth="max-w-5xl"
      >
        {loading || !caseData ? (
          <div className="py-12 text-center text-gov-textLight text-xs">
            Retrieving official case history and linked coordination intelligence...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Overview Strip */}
            <div className="bg-gov-bg p-3 border border-gov-border rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono font-bold text-gov-navy text-sm">{caseData.id}</span>
                <StatusBadge status={caseData.status} />
                <PriorityBadge priority={caseData.priority} />
                <span className="text-gov-textMuted font-medium border-l border-gov-border pl-3">
                  Bureau: <strong className="text-gov-text">{caseData.department}</strong>
                </span>
                <span className="text-gov-textMuted font-medium border-l border-gov-border pl-3">
                  Officer: <strong className="text-gov-text">{caseData.assignedOfficialName || 'Unassigned'}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 no-print">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Printer}
                  onClick={() => window.print()}
                  title="Print official case summary sheet"
                >
                  Print
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={UserCheck}
                  onClick={() => setShowAssignModal(true)}
                >
                  Reassign
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Edit3}
                  onClick={() => setShowStatusModal(true)}
                >
                  Update Status
                </Button>
              </div>
            </div>

            {/* Main Two-Column Structure */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
              {/* Left Column (2 Cols): Facts, Complainant, Timeline */}
              <div className="lg:col-span-2 space-y-4">
                {/* Grievance Facts & Particulars */}
                <div className="bg-white border border-gov-border rounded-xs p-3.5 space-y-2">
                  <div className="text-xxs font-bold uppercase tracking-wider text-gov-navy border-b border-gov-border pb-1">
                    Grievance Particulars & Alleged Non-Compliance
                  </div>
                  <div>
                    <span className="text-gov-textMuted font-semibold">Complaint Category:</span>
                    <p className="font-bold text-gov-text">{caseData.category}</p>
                  </div>
                  <div>
                    <span className="text-gov-textMuted font-semibold">Allegation Summary:</span>
                    <p className="text-gov-text leading-relaxed mt-0.5 whitespace-pre-wrap bg-gov-bg p-2.5 border border-gov-borderLight rounded-xs font-sans">
                      {caseData.description}
                    </p>
                  </div>

                  {caseData.findings && (
                    <div className="mt-2 p-2.5 bg-amber-50/50 border border-amber-200 rounded-xs">
                      <span className="text-xxs font-bold uppercase tracking-wider text-amber-900 block mb-0.5">
                        Inquiry Committee / Inspection Findings:
                      </span>
                      <p className="text-amber-950 leading-relaxed font-sans">
                        {caseData.findings}
                      </p>
                    </div>
                  )}

                  {caseData.disposalRemarks && (
                    <div className="mt-2 p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xs">
                      <span className="text-xxs font-bold uppercase tracking-wider text-emerald-900 block mb-0.5">
                        Disposal Order / Redressal Compliance:
                      </span>
                      <p className="text-emerald-950 leading-relaxed font-sans">
                        {caseData.disposalRemarks}
                      </p>
                    </div>
                  )}
                </div>

                {/* Complainant & Source Metadata */}
                <div className="bg-white border border-gov-border rounded-xs p-3.5 space-y-2">
                  <div className="text-xxs font-bold uppercase tracking-wider text-gov-navy border-b border-gov-border pb-1">
                    Complainant & Receipt Particulars
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gov-textLight">Complainant Delegation:</span>
                      <p className="font-semibold text-gov-text">{caseData.complainantName}</p>
                    </div>
                    <div>
                      <span className="text-gov-textLight">Complainant Classification:</span>
                      <p className="font-semibold text-gov-text">{caseData.complainantType}</p>
                    </div>
                    <div>
                      <span className="text-gov-textLight">Date Formally Received:</span>
                      <p className="font-mono text-gov-text">
                        {caseData.receivedAt ? new Date(caseData.receivedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gov-textLight">Intake Channel:</span>
                      <p className="text-gov-text font-medium">{caseData.createdBy || 'AICTE Online Portal'}</p>
                    </div>
                  </div>
                </div>

                {/* Action History Vertical Timeline */}
                <div className="bg-white border border-gov-border rounded-xs p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-gov-border pb-1">
                    <div className="flex items-center gap-1.5 text-xxs font-bold uppercase tracking-wider text-gov-navy">
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>Procedural Action History ({history.length} Entries)</span>
                    </div>
                    <span className="text-[10px] text-gov-textLight font-mono">Immutable Compliance Log</span>
                  </div>

                  <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gov-border">
                    {history.map((h, i) => (
                      <div key={h.id || i} className="relative text-xs">
                        <div className="absolute -left-5 top-1 w-2 h-2 rounded-none bg-gov-navy" />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gov-navy uppercase tracking-wide text-xxs">
                            {h.action}
                          </span>
                          <span className="text-xxs text-gov-textLight font-mono">
                            {new Date(h.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-gov-textLight">
                          Officer: <strong className="text-gov-text">{h.actorName}</strong> ({h.actorRole})
                        </div>
                        <p className="text-gov-text text-xs mt-0.5 bg-gov-bg p-2 border border-gov-borderLight rounded-xs">
                          {h.remarks}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Add Remark Form */}
                  <form onSubmit={handleRemarkSubmit} className="pt-3 border-t border-gov-border mt-3 space-y-2">
                    <label className="block text-xxs font-bold uppercase tracking-wider text-gov-navy">
                      Append Case Note / Interim Remark
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Document procedural communication or inspection scheduling note..."
                        value={newRemark}
                        onChange={(e) => setNewRemark(e.target.value)}
                        className="flex-1 text-xs bg-white border border-gov-border rounded-xs px-2.5 py-1.5 focus:ring-1 focus:ring-gov-navy"
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="md"
                        disabled={submittingRemark || !newRemark.trim()}
                      >
                        {submittingRemark ? 'Saving...' : 'Add Note'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column (1 Col): Status, SLA, Coordination, Similar Groups */}
              <div className="space-y-4">
                {/* Official Allocation & SLA Card */}
                <div className="bg-white border border-gov-border rounded-xs p-3.5 space-y-2.5">
                  <div className="text-xxs font-bold uppercase tracking-wider text-gov-navy border-b border-gov-border pb-1">
                    Allocation & Target
                  </div>
                  <div>
                    <span className="text-gov-textLight">Disposal SLA Target:</span>
                    <p className="font-mono font-bold text-gov-text text-sm mt-0.5">
                      {caseData.expectedDisposalAt ? new Date(caseData.expectedDisposalAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gov-textLight">Next Action Required:</span>
                    <p className="font-semibold text-gov-navy mt-0.5 p-2 bg-gov-bg border border-gov-border rounded-xs">
                      {caseData.nextAction || 'Pending review'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gov-textLight">Auto-Assignment Rationale:</span>
                    <p className="text-[11px] text-gov-textMuted italic bg-slate-50 p-2 border border-gov-borderLight rounded-xs mt-0.5">
                      {caseData.assignmentReason || 'Standard assignment'}
                    </p>
                  </div>
                </div>

                {/* Common Issue Group Membership */}
                <div className="bg-white border border-gov-border rounded-xs p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-gov-border pb-1">
                    <span className="text-xxs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1">
                      <GitMerge className="w-3.5 h-3.5 text-teal-700" /> Issue Group (UVP 2)
                    </span>
                    <Link to="/similarity" className="text-xxs font-semibold text-teal-800 hover:underline">
                      Manage →
                    </Link>
                  </div>

                  {issueGroup ? (
                    <div className="space-y-1.5 p-2.5 bg-teal-50/50 border border-teal-200 rounded-xs text-xs">
                      <div className="font-mono font-bold text-teal-900">{issueGroup.id}</div>
                      <div className="font-semibold text-gov-text">{issueGroup.title}</div>
                      <p className="text-[11px] text-gov-textMuted">{issueGroup.issueSummary}</p>
                      <div className="text-[10px] text-teal-800 pt-1 border-t border-teal-200 font-semibold">
                        Lead Official: {issueGroup.leadOfficialName || 'Coordinated'}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xxs text-gov-textLight py-2 italic">
                      This complaint has not been clustered into a Common Issue Group.
                    </p>
                  )}
                </div>

                {/* Similar Complaints Suggestions Panel */}
                {similarCases.length > 0 && (
                  <div className="bg-white border border-gov-border rounded-xs p-3.5 space-y-2">
                    <div className="text-xxs font-bold uppercase tracking-wider text-gov-navy border-b border-gov-border pb-1">
                      Correlated Complaints ({similarCases.length})
                    </div>
                    <div className="space-y-2">
                      {similarCases.slice(0, 3).map((sim, idx) => (
                        <div key={idx} className="p-2 border border-gov-border bg-gov-bg rounded-xs text-xs space-y-1">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-gov-navy">{sim.case.id}</span>
                            <span className="text-xxs font-bold text-teal-800 bg-teal-100 px-1 py-0.2 rounded-xs border border-teal-200">
                              {sim.similarityScore}% match
                            </span>
                          </div>
                          <p className="text-xxs text-gov-textMuted line-clamp-2">
                            {sim.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Update Submodal */}
      {showStatusModal && caseData && (
        <StatusUpdateModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          currentCase={caseData}
          onUpdated={async () => {
            await loadCaseDetails();
            if (onCaseUpdated) onCaseUpdated();
          }}
        />
      )}

      {/* Assign Official Submodal */}
      {showAssignModal && caseData && (
        <AssignModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          currentCase={caseData}
          onAssigned={async () => {
            await loadCaseDetails();
            if (onCaseUpdated) onCaseUpdated();
          }}
        />
      )}
    </>
  );
};
