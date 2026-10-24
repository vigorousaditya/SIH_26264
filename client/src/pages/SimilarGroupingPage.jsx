import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { CaseDetailModal } from '../components/cases/CaseDetailModal';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import {
  GitMerge,
  CheckCircle2,
  XCircle,
  Building2,
  Scan,
  Plus,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';

export const SimilarGroupingPage = () => {
  const { user } = useAuth();
  const { showToast } = useAlert();
  const [issueGroups, setIssueGroups] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Lead official selector per suggestion card
  const [leadOfficials, setLeadOfficials] = useState({});

  // Create Custom Group Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [institutionCases, setInstitutionCases] = useState([]);
  const [newGroupForm, setNewGroupForm] = useState({
    institutionId: '',
    title: '',
    issueSummary: '',
    primaryCategory: 'Faculty Salary & Non-Payment',
    linkedCaseIds: [],
    leadOfficialId: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [grpRes, suggRes, instRes, offRes] = await Promise.all([
        api.getIssueGroups(),
        api.scanSuggestions(),
        api.getInstitutions(),
        api.getOfficials()
      ]);
      if (grpRes.success) setIssueGroups(grpRes.data);
      if (suggRes.success) {
        setSuggestions(suggRes.data);
        // Pre-populate lead officials
        const leads = {};
        suggRes.data.forEach((s, idx) => {
          leads[idx] = s.primaryCase.assignedOfficialId || s.matchedCase.assignedOfficialId || '';
        });
        setLeadOfficials(leads);
      }
      if (instRes.success) {
        setInstitutions(instRes.data);
        if (instRes.data.length > 0 && !newGroupForm.institutionId) {
          setNewGroupForm(prev => ({ ...prev, institutionId: instRes.data[0].id }));
        }
      }
      if (offRes.success) setOfficials(offRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load similar groups data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When selected institution in create form changes, load its cases
  useEffect(() => {
    if (newGroupForm.institutionId) {
      api.getCases(`?institutionId=${newGroupForm.institutionId}`).then(res => {
        if (res.success) setInstitutionCases(res.data);
      });
    }
  }, [newGroupForm.institutionId]);

  const handleScanLive = async () => {
    setScanning(true);
    try {
      const res = await api.scanSuggestions();
      if (res.success) {
        setSuggestions(res.data);
        showToast(`Scan complete: Identified ${res.count} potential complaint clusters.`, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleApproveSuggestion = async (suggestion, idx) => {
    try {
      const leadId = leadOfficials[idx] || suggestion.primaryCase.assignedOfficialId;
      const payload = {
        institutionId: suggestion.primaryCase.institutionId,
        title: suggestion.recommendedGroupTitle,
        issueSummary: `Algorithmic TF-IDF correlation matched ${suggestion.primaryCase.id} and ${suggestion.matchedCase.id} due to ${suggestion.explanation}`,
        primaryCategory: suggestion.primaryCase.category,
        linkedCaseIds: [suggestion.primaryCase.id, suggestion.matchedCase.id],
        leadOfficialId: leadId
      };

      const res = await api.createIssueGroup(payload);
      if (res.success) {
        showToast(`Approved and formulated Common Issue Group ${res.data.id}. Individual complaints preserved.`, 'success');
        fetchData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDismissSuggestion = (index) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
    showToast('Suggested group dismissed from review queue.', 'info');
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupForm.title.trim() || !newGroupForm.issueSummary.trim() || newGroupForm.linkedCaseIds.length === 0) {
      showToast('Please provide a group title, summary, and select at least one complaint.', 'warning');
      return;
    }

    try {
      const res = await api.createIssueGroup(newGroupForm);
      if (res.success) {
        showToast(`Common Issue Group ${res.data.id} created successfully.`, 'success');
        setShowCreateModal(false);
        fetchData();
        setNewGroupForm({
          institutionId: institutions[0]?.id || '',
          title: '',
          issueSummary: '',
          primaryCategory: 'Faculty Salary & Non-Payment',
          linkedCaseIds: [],
          leadOfficialId: ''
        });
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleCaseSelection = (caseId) => {
    setNewGroupForm(prev => {
      const current = prev.linkedCaseIds || [];
      if (current.includes(caseId)) {
        return { ...prev, linkedCaseIds: current.filter(id => id !== caseId) };
      } else {
        return { ...prev, linkedCaseIds: [...current, caseId] };
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Similar Complaint Intelligence & Issue Groups (UVP 2)"
        subtitle="Identifies systemic patterns across duplicate or related complaints at the same campus while strictly preserving separate case records."
        badge={`${issueGroups.length} Active Groups`}
        breadcrumbs={[{ label: 'Coordination' }, { label: 'Similar Issue Groups' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={Scan}
              loading={scanning}
              onClick={handleScanLive}
            >
              Scan Complaints
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setShowCreateModal(true)}
            >
              Form Issue Group
            </Button>
          </div>
        }
      />

      {/* Suggested Matches Review Queue Section */}
      <div className="bg-white border border-gov-border rounded-xs shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gov-border pb-2.5">
          <div>
            <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider flex items-center gap-1.5">
              <span>Suggested Groups for Official Review</span>
              <span className="text-xxs font-normal px-2 py-0.5 rounded-xs bg-amber-50 text-status-pending border border-amber-300 font-semibold uppercase">
                Needs Official Decision
              </span>
            </h2>
            <p className="text-xxs text-gov-textLight mt-0.5">
              The system does not merge complaints automatically. Official review is required to approve or dismiss grouping.
            </p>
          </div>
          <span className="text-xxs font-mono text-gov-textLight">{suggestions.length} Suggested Clusters</span>
        </div>

        {suggestions.length === 0 ? (
          <div className="py-6 text-center text-gov-textLight text-xs bg-gov-bg border border-gov-borderLight rounded-xs">
            No unreviewed grouping suggestions detected. Click "Scan Complaints" to evaluate recent intake.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {suggestions.map((sugg, idx) => (
              <div key={idx} className="bg-white p-3.5 border border-gov-border rounded-xs shadow-subtle space-y-2.5 text-xs">
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gov-navy text-xs truncate max-w-[280px]">
                    {sugg.recommendedGroupTitle}
                  </div>
                  <span className="text-xxs font-mono font-bold px-2 py-0.5 rounded-xs bg-teal-50 text-teal-800 border border-teal-300 shrink-0">
                    {sugg.similarityScore}% Correlation
                  </span>
                </div>

                {/* Side-by-Side Comparison of Complaints */}
                <div className="grid grid-cols-2 gap-2 p-2 bg-gov-bg border border-gov-borderLight rounded-xs text-xxs">
                  {/* Case 1 */}
                  <div 
                    onClick={() => setSelectedCaseId(sugg.primaryCase.id)}
                    className="p-1.5 bg-white border border-gov-borderLight rounded-xs cursor-pointer hover:border-gov-navy transition-colors"
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-gov-navy mb-0.5">
                      <span>{sugg.primaryCase.id}</span>
                      <span className="text-[9px] text-gov-textLight font-normal">Case A</span>
                    </div>
                    <div className="text-gov-text font-semibold truncate">{sugg.primaryCase.category}</div>
                    <p className="text-gov-textMuted line-clamp-2 mt-0.5 leading-snug">{sugg.primaryCase.description}</p>
                    <div className="text-[10px] text-gov-textLight mt-1 pt-1 border-t border-slate-100">
                      By: {sugg.primaryCase.complainantType}
                    </div>
                  </div>

                  {/* Case 2 */}
                  <div 
                    onClick={() => setSelectedCaseId(sugg.matchedCase.id)}
                    className="p-1.5 bg-white border border-gov-borderLight rounded-xs cursor-pointer hover:border-gov-navy transition-colors"
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-gov-navy mb-0.5">
                      <span>{sugg.matchedCase.id}</span>
                      <span className="text-[9px] text-gov-textLight font-normal">Case B</span>
                    </div>
                    <div className="text-gov-text font-semibold truncate">{sugg.matchedCase.category}</div>
                    <p className="text-gov-textMuted line-clamp-2 mt-0.5 leading-snug">{sugg.matchedCase.description}</p>
                    <div className="text-[10px] text-gov-textLight mt-1 pt-1 border-t border-slate-100">
                      By: {sugg.matchedCase.complainantType}
                    </div>
                  </div>
                </div>

                {/* Shared Vocabulary */}
                {sugg.sharedKeywords?.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap text-xxs text-gov-textLight">
                    <span className="font-semibold text-gov-textMuted">Matching Terms:</span>
                    {sugg.sharedKeywords.map((kw, i) => (
                      <span key={i} className="font-mono px-1 py-0.2 bg-slate-100 text-gov-text rounded-xs border border-slate-200">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xxs text-gov-textMuted italic bg-slate-50 p-2 border border-gov-borderLight rounded-xs">
                  Rationale: {sugg.explanation}
                </p>

                {/* Lead Official Selector & Action Row */}
                <div className="pt-2 border-t border-gov-border flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={`lead-officer-${idx}`} className="text-xxs font-semibold text-gov-textMuted">Lead Officer:</label>
                    <select
                      id={`lead-officer-${idx}`}
                      value={leadOfficials[idx] || ''}
                      onChange={(e) => setLeadOfficials({ ...leadOfficials, [idx]: e.target.value })}
                      className="text-xxs bg-white border border-gov-border rounded-xs px-1.5 py-0.5"
                    >
                      <option value="">Select official...</option>
                      {officials.map(o => (
                        <option key={o.id} value={o.id}>{o.name} ({o.department.split(' ')[0]})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDismissSuggestion(idx)}
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={CheckCircle2}
                      onClick={() => handleApproveSuggestion(sugg, idx)}
                    >
                      Approve & Form Group
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Common Issue Groups Directory */}
      <div className="bg-white border border-gov-border rounded-xs shadow-card p-4 space-y-3">
        <div className="border-b border-gov-border pb-2.5">
          <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Active Common Issue Groups ({issueGroups.length})
          </h2>
          <p className="text-xxs text-gov-textLight mt-0.5">
            Formalized multi-complaint clusters with designated lead officials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {issueGroups.map((grp) => (
            <div key={grp.id} className="p-3.5 border border-gov-border bg-gov-bg rounded-xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-teal-900 bg-teal-50 px-2 py-0.5 border border-teal-300 rounded-xs">
                  {grp.id}
                </span>
                <span className="text-xxs font-bold px-1.5 py-0.2 rounded-xs bg-status-disposedBg text-status-disposed border border-status-disposedBorder uppercase">
                  {grp.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-gov-text text-sm">{grp.title}</h3>
                <div className="text-xxs text-gov-textLight mt-0.5">Campus: {grp.institutionName}</div>
              </div>

              <p className="text-xs text-gov-textMuted bg-white p-2.5 border border-gov-border rounded-xs leading-relaxed">
                {grp.issueSummary}
              </p>

              {/* Linked Complaints (Independent Case Records) */}
              <div className="pt-2 border-t border-gov-border space-y-1">
                <span className="text-xxs font-bold uppercase tracking-wider text-gov-textLight block">
                  Independently Preserved Complaints ({grp.linkedCaseIds?.length || 0}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {grp.linkedCaseIds?.map((cid) => (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => setSelectedCaseId(cid)}
                      className="px-2 py-0.5 text-xxs font-mono font-bold bg-white text-gov-navy hover:bg-slate-100 rounded-xs border border-gov-border transition-colors"
                    >
                      {cid} ↗
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xxs text-gov-textLight pt-1 border-t border-gov-borderLight flex items-center justify-between">
                <span>Lead Official: <strong className="text-gov-text">{grp.leadOfficialName || 'Coordinated'}</strong></span>
                <span>Approved By: <strong className="text-gov-text">{grp.approvedBy || 'System Admin'}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Custom Issue Group Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Form Common Issue Group (Administrative Cluster)"
          subtitle="Form a coordination group while preserving each complainant's individual case record."
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleCreateGroupSubmit} className="space-y-3 text-xs">
            <FormField label="Target Institution" required id="institutionId">
              <select
                id="institutionId"
                value={newGroupForm.institutionId}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, institutionId: e.target.value })}
                className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 font-semibold"
              >
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name} ({inst.permanentId})</option>
                ))}
              </select>
            </FormField>

            <FormField label="Group Classification Title" required id="title">
              <input
                id="title"
                type="text"
                placeholder="e.g. Systemic Faculty Salary Arrears & Certificate Withholding"
                value={newGroupForm.title}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, title: e.target.value })}
                className="w-full text-xs bg-white border border-gov-border rounded-xs p-2"
                required
              />
            </FormField>

            <FormField label="Common Issue Pattern Summary" required id="issueSummary">
              <textarea
                id="issueSummary"
                rows={2}
                placeholder="Synthesize the underlying pattern observed across these grievances..."
                value={newGroupForm.issueSummary}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, issueSummary: e.target.value })}
                className="w-full text-xs bg-white border border-gov-border rounded-xs p-2"
                required
              />
            </FormField>

            <FormField label="Lead Designated Official" id="leadOfficialId">
              <select
                id="leadOfficialId"
                value={newGroupForm.leadOfficialId}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, leadOfficialId: e.target.value })}
                className="w-full text-xs bg-white border border-gov-border rounded-xs p-2"
              >
                <option value="">Select official...</option>
                {officials.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.department})</option>
                ))}
              </select>
            </FormField>

            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Link Complaints at this Campus (Select at least 1)
              </label>
              <div className="space-y-1 max-h-36 overflow-y-auto p-2 bg-gov-bg border border-gov-border rounded-xs">
                {institutionCases.length === 0 ? (
                  <p className="text-xxs text-gov-textLight text-center py-3">No cases on record for this institution.</p>
                ) : (
                  institutionCases.map(c => (
                    <label key={c.id} className="flex items-center gap-2 p-1 hover:bg-white rounded-xs cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={newGroupForm.linkedCaseIds?.includes(c.id)}
                        onChange={() => toggleCaseSelection(c.id)}
                        className="rounded-xs text-gov-navy focus:ring-gov-navy"
                      />
                      <span className="font-mono font-bold text-gov-navy">{c.id}</span>
                      <span className="text-gov-text truncate">{c.category} ({c.status})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
              <Button variant="secondary" size="md" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit">
                Create Issue Group
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
          onCaseUpdated={fetchData}
        />
      )}
    </div>
  );
};
