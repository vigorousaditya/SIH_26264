import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { CaseDetailModal } from '../components/cases/CaseDetailModal';
import {
  Network,
  Filter,
  Plus,
  ShieldAlert,
  Building2,
  CheckCircle2,
  ExternalLink,
  Info,
  Clock,
  Layers
} from 'lucide-react';

// Square-ish, crisp Government Case Node for React Flow
const CaseNode = ({ data }) => {
  return (
    <div 
      className="bg-white rounded-xs border-2 shadow-subtle p-2.5 w-52 text-xs transition-all hover:border-gov-navy select-none"
      style={{ borderColor: data.statusColor || '#0B3C5D' }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !rounded-none" />
      
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono font-bold text-gov-navy text-xs">{data.id}</span>
        <span 
          className="text-[9px] font-bold px-1.5 py-0.2 rounded-xs uppercase text-white font-mono"
          style={{ backgroundColor: data.statusColor || '#0B3C5D' }}
        >
          {data.status}
        </span>
      </div>

      <div className="font-bold text-gov-text truncate text-xs mb-0.5">{data.category}</div>
      <div className="text-[10.5px] text-gov-textLight truncate flex items-center gap-1">
        <Building2 className="w-3 h-3 text-slate-400" /> {data.institutionName}
      </div>

      <div className="mt-2 pt-1 border-t border-gov-borderLight flex items-center justify-between text-[10px]">
        <span className="text-gov-textMuted font-medium truncate max-w-[100px]">{data.assignedOfficialName}</span>
        <span className="font-semibold text-gov-text uppercase">{data.priority}</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !rounded-none" />
    </div>
  );
};

export const ImpactMapPage = () => {
  const { user } = useAuth();
  const { showToast } = useAlert();
  const [searchParams] = useSearchParams();

  // Filters
  const [institutionId, setInstitutionId] = useState(searchParams.get('institutionId') || 'all');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');

  const [institutions, setInstitutions] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawRelationships, setRawRelationships] = useState([]);
  const [impactAlerts, setImpactAlerts] = useState([]);

  // Selected node inspection drawer
  const [activeNodeData, setActiveNodeData] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Add Relationship Modal
  const [showAddRelModal, setShowAddRelModal] = useState(false);
  const [relForm, setRelForm] = useState({
    sourceCaseId: '',
    targetCaseId: '',
    relationshipType: 'Possible dependency',
    explanation: '',
    confidenceScore: 85
  });

  const nodeTypes = useMemo(() => ({ caseNode: CaseNode }), []);

  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const query = `?institutionId=${institutionId}&department=${department}&status=${status}`;
      const [graphRes, notifRes, instRes, caseRes] = await Promise.all([
        api.getGraphData(query),
        api.getNotifications('?type=IMPACT_ALERT'),
        api.getInstitutions(),
        api.getCases()
      ]);

      if (graphRes.success) {
        setNodes(graphRes.nodes);
        setEdges(graphRes.edges);
        setRawRelationships(graphRes.rawRelationships);
        // Pre-select first node if none selected
        if (graphRes.nodes.length > 0 && !activeNodeData) {
          setActiveNodeData(graphRes.nodes[0].data);
        }
      }
      if (notifRes.success) {
        setImpactAlerts(notifRes.data.filter(n => !n.acknowledged));
      }
      if (instRes.success) setInstitutions(instRes.data);
      if (caseRes.success) {
        setAllCases(caseRes.data);
        if (caseRes.data.length >= 2 && !relForm.sourceCaseId) {
          setRelForm(prev => ({
            ...prev,
            sourceCaseId: caseRes.data[0].id,
            targetCaseId: caseRes.data[1].id
          }));
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load dependency map data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [institutionId, department, status, setNodes, setEdges]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  const onNodeClick = (event, node) => {
    setActiveNodeData(node.data);
  };

  const handleCreateRelationship = async (e) => {
    e.preventDefault();
    if (relForm.sourceCaseId === relForm.targetCaseId) {
      showToast('Cannot connect a complaint to itself.', 'warning');
      return;
    }
    if (!relForm.explanation.trim()) {
      showToast('Please provide an explanation for this connection.', 'warning');
      return;
    }

    try {
      const res = await api.createRelationship(relForm);
      if (res.success) {
        showToast('Inter-case relationship mapped successfully.', 'success');
        setShowAddRelModal(false);
        fetchGraphData();
        setRelForm(prev => ({ ...prev, explanation: '' }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmRelationship = async (relId, newStatus) => {
    try {
      const res = await api.updateRelationshipStatus(relId, newStatus);
      if (res.success) {
        showToast(`Relationship marked as ${newStatus}.`, 'success');
        fetchGraphData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      const res = await api.acknowledgeNotification(alertId, 'Official reviewed case dependency graph and acknowledged advisory.');
      if (res.success) {
        showToast('Impact advisory acknowledged and logged to compliance trail.', 'success');
        fetchGraphData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Case Dependency & Impact Intelligence Map (UVP 3)"
        subtitle="Visual graph mapping correlations between complaints and regulatory reviews. Automated alerts notify officials when connected cases receive key findings."
        badge={`${nodes.length} Nodes • ${edges.length} Links`}
        breadcrumbs={[{ label: 'Coordination' }, { label: 'Dependency Map' }]}
        actions={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setShowAddRelModal(true)}
          >
            Map Case Dependency
          </Button>
        }
      />

      {/* Change-Triggered Impact Alerts Banner (UVP 3) */}
      {impactAlerts.length > 0 && (
        <div className="p-3.5 bg-red-50/50 border border-red-300 rounded-xs shadow-card space-y-2">
          <div className="flex items-center justify-between border-b border-red-200 pb-1.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-status-overdue" />
              <h2 className="text-xs font-bold text-red-950 uppercase tracking-wider">
                Change-Triggered Coordination Advisories ({impactAlerts.length})
              </h2>
            </div>
            <span className="text-[10px] text-gov-textLight italic">
              Human Review Advisory • Recommendations for Administrative Coordination
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {impactAlerts.map(alert => (
              <div key={alert.id} className="p-2 bg-white border border-red-200 rounded-xs flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-gov-text text-xs mb-0.5">{alert.title}</div>
                  <p className="text-xxs text-gov-textMuted leading-relaxed">{alert.message}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedCaseId(alert.relatedCaseId)}
                  >
                    View File
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar & Legend */}
      <div className="bg-white p-3 border border-gov-border rounded-xs shadow-card flex flex-wrap items-center gap-3 justify-between text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="filter-inst" className="text-gov-textMuted font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
          </label>

          <select
            id="filter-inst"
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            className="bg-white border border-gov-border rounded-xs px-2 py-1 font-medium text-xs"
          >
            <option value="all">All Campuses</option>
            {institutions.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="bg-white border border-gov-border rounded-xs px-2 py-1 font-medium text-xs"
          >
            <option value="all">All Bureaus</option>
            <option value="Regulation Bureau (RB)">Regulation Bureau (RB)</option>
            <option value="Public Grievance Redressal Cell (PGRC)">PGRC Cell</option>
            <option value="Approval Bureau (AB)">Approval Bureau (AB)</option>
            <option value="Faculty Development Cell (FDC)">FDC Cell</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white border border-gov-border rounded-xs px-2 py-1 font-medium text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Under Process">Under Process</option>
            <option value="Escalated">Escalated</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>

        {/* Clean Muted Legend */}
        <div className="flex items-center gap-3 text-xxs text-gov-textLight font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#D97706] rounded-none shrink-0" /> Pending
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#1E40AF] rounded-none shrink-0" /> Under Process
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#991B1B] rounded-none shrink-0" /> Escalated
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#166534] rounded-none shrink-0" /> Disposed
          </span>
        </div>
      </div>

      {/* Main Graph & Side Inspection Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Visual Graph View (React Flow) */}
        <div className="lg:col-span-3 bg-slate-900 border border-gov-border rounded-xs shadow-card h-[520px] relative overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Calculating node layout and dependency matrix...
            </div>
          ) : nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              No complaint nodes in selected scope. Adjust the filter criteria above.
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Background color="#334155" gap={20} size={1} />
              <Controls className="!bg-slate-800 !border-slate-700 !text-white !rounded-xs" />
            </ReactFlow>
          )}

          <div className="absolute top-3 left-3 bg-slate-950/80 px-2.5 py-1 text-xxs text-slate-300 border border-slate-700 rounded-xs pointer-events-none">
            Click any case node to inspect particulars in the right panel.
          </div>
        </div>

        {/* Selected Node Details Side Panel */}
        <div className="bg-white border border-gov-border rounded-xs shadow-card p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="border-b border-gov-border pb-2 mb-2.5">
              <span className="text-xxs font-bold uppercase tracking-wider text-gov-navy block">
                Selected Node Inspection
              </span>
              <div className="text-sm font-bold text-gov-text font-mono mt-0.5">
                {activeNodeData ? activeNodeData.id : 'No Node Selected'}
              </div>
            </div>

            {activeNodeData ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-gov-textLight text-xxs block">Institution Name:</span>
                  <p className="font-semibold text-gov-text">{activeNodeData.institutionName}</p>
                </div>

                <div>
                  <span className="text-gov-textLight text-xxs block">Grievance Category:</span>
                  <p className="font-semibold text-gov-text">{activeNodeData.category}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xxs">
                  <div>
                    <span className="text-gov-textLight block">Status:</span>
                    <strong className="text-gov-text uppercase font-mono">{activeNodeData.status}</strong>
                  </div>
                  <div>
                    <span className="text-gov-textLight block">Priority:</span>
                    <strong className="text-gov-text uppercase font-mono">{activeNodeData.priority}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-gov-textLight text-xxs block">Assigned Officer:</span>
                  <p className="font-semibold text-gov-navy">{activeNodeData.assignedOfficialName}</p>
                  <p className="text-xxs text-gov-textLight">{activeNodeData.department}</p>
                </div>

                <div>
                  <span className="text-gov-textLight text-xxs block">Grievance Summary:</span>
                  <p className="text-xxs text-gov-textMuted bg-gov-bg p-2 border border-gov-borderLight rounded-xs line-clamp-4 leading-relaxed font-sans">
                    {activeNodeData.description}
                  </p>
                </div>

                {/* Connected Dependencies Count for this node */}
                <div className="pt-2 border-t border-gov-borderLight text-xxs text-gov-textLight">
                  <span>Linked in </span>
                  <strong className="text-gov-navy font-mono">
                    {rawRelationships.filter(r => r.sourceCaseId === activeNodeData.id || r.targetCaseId === activeNodeData.id).length}
                  </strong>
                  <span> dependency connections.</span>
                </div>
              </div>
            ) : (
              <p className="text-xxs text-gov-textLight py-6 text-center italic">
                Click a case node on the graph to view summary data.
              </p>
            )}
          </div>

          {activeNodeData && (
            <div className="pt-3 border-t border-gov-border">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => setSelectedCaseId(activeNodeData.id)}
              >
                Open Full Case Record
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mapped Dependencies Data Table */}
      <div className="bg-white border border-gov-border rounded-xs shadow-card p-4 space-y-2.5">
        <div className="border-b border-gov-border pb-2">
          <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Verified Relationships & Link Rationale ({rawRelationships.length})
          </h2>
          <p className="text-xxs text-gov-textLight mt-0.5">
            Structured explanations justifying inter-case coordination and impact warnings.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left gov-table">
            <thead>
              <tr>
                <th className="w-40">Connected Case Pair</th>
                <th className="w-36">Relationship Classification</th>
                <th>Nexus Explanation</th>
                <th className="w-24 text-center">Confidence</th>
                <th className="w-28">Review Status</th>
                <th className="w-28 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rawRelationships.map((rel) => (
                <tr key={rel.id}>
                  <td className="font-mono font-bold text-gov-navy whitespace-nowrap">
                    <button type="button" onClick={() => setSelectedCaseId(rel.sourceCaseId)} className="hover:underline">
                      {rel.sourceCaseId}
                    </button>
                    <span className="text-slate-400 mx-1.5 font-normal">↔</span>
                    <button type="button" onClick={() => setSelectedCaseId(rel.targetCaseId)} className="hover:underline">
                      {rel.targetCaseId}
                    </button>
                  </td>
                  <td className="font-semibold text-gov-text text-xs">
                    {rel.relationshipType}
                  </td>
                  <td className="text-xxs text-gov-textMuted max-w-sm truncate">
                    {rel.explanation}
                  </td>
                  <td className="text-center font-mono font-bold text-gov-navy text-xs">
                    {rel.confidenceScore}%
                  </td>
                  <td>
                    <span className={`text-xxs font-bold px-1.5 py-0.2 rounded-xs uppercase ${
                      rel.reviewStatus === 'Confirmed' ? 'bg-emerald-50 text-status-disposed border border-emerald-300' : 'bg-amber-50 text-status-pending border border-amber-300'
                    }`}>
                      {rel.reviewStatus}
                    </span>
                  </td>
                  <td className="text-right">
                    {rel.reviewStatus === 'Suggested' ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleConfirmRelationship(rel.id, 'Confirmed')}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleConfirmRelationship(rel.id, 'Dismissed')}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xxs text-gov-textLight font-mono">Confirmed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Map Relationship Modal */}
      {showAddRelModal && (
        <Modal
          isOpen={showAddRelModal}
          onClose={() => setShowAddRelModal(false)}
          title="Map Inter-Case Dependency Link (UVP 3)"
          subtitle="Formally correlate two complaint files for impact tracking and coordination."
        >
          <form onSubmit={handleCreateRelationship} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Source Complaint Case" required id="sourceCaseId">
                <select
                  id="sourceCaseId"
                  value={relForm.sourceCaseId}
                  onChange={(e) => setRelForm({ ...relForm, sourceCaseId: e.target.value })}
                  className="w-full bg-white border border-gov-border rounded-xs p-2 font-mono"
                >
                  {allCases.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.institutionName.slice(0, 22)} ({c.category.slice(0, 18)})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Target Complaint Case" required id="targetCaseId">
                <select
                  id="targetCaseId"
                  value={relForm.targetCaseId}
                  onChange={(e) => setRelForm({ ...relForm, targetCaseId: e.target.value })}
                  className="w-full bg-white border border-gov-border rounded-xs p-2 font-mono"
                >
                  {allCases.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.institutionName.slice(0, 22)} ({c.category.slice(0, 18)})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Relationship Classification" required id="relationshipType">
              <select
                id="relationshipType"
                value={relForm.relationshipType}
                onChange={(e) => setRelForm({ ...relForm, relationshipType: e.target.value })}
                className="w-full bg-white border border-gov-border rounded-xs p-2"
              >
                <option value="Possible dependency">Possible dependency</option>
                <option value="Similar issue">Similar issue</option>
                <option value="Needs review">Needs review (High Risk)</option>
                <option value="Same institution">Same institution</option>
                <option value="Duplicate complaint">Duplicate complaint</option>
              </select>
            </FormField>

            <FormField label="Nexus Rationale & Correlation Reason" required id="explanation">
              <textarea
                id="explanation"
                rows={2}
                placeholder="Explain why these complaints correlate and how updates in one impact the other..."
                value={relForm.explanation}
                onChange={(e) => setRelForm({ ...relForm, explanation: e.target.value })}
                className="w-full bg-white border border-gov-border rounded-xs p-2 font-sans"
                required
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
              <Button variant="secondary" size="md" onClick={() => setShowAddRelModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit">
                Map Relationship
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Case Detail Modal */}
      {selectedCaseId && (
        <CaseDetailModal
          isOpen={!!selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          caseId={selectedCaseId}
          onCaseUpdated={fetchGraphData}
        />
      )}
    </div>
  );
};
