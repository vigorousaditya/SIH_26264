import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { AssignModal } from '../components/cases/AssignModal';
import { CaseDetailModal } from '../components/cases/CaseDetailModal';
import { TableSkeleton } from '../components/common/Skeleton';
import {
  Users2,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';

export const WorkloadPage = () => {
  const { user } = useAuth();
  const { showToast } = useAlert();
  const [officials, setOfficials] = useState([]);
  const [unassignedCases, setUnassignedCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Limit Modal
  const [editingOfficial, setEditingOfficial] = useState(null);
  const [newLimit, setNewLimit] = useState(10);

  // Manual Assign Modal
  const [assigningCase, setAssigningCase] = useState(null);
  const [viewingCaseId, setViewingCaseId] = useState(null);

  // Interactive Live Simulator
  const [simDept, setSimDept] = useState('Regulation Bureau (RB)');
  const [simCategory, setSimCategory] = useState('Faculty Salary & Non-Payment');
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const fetchWorkloadData = async () => {
    setLoading(true);
    try {
      const [offRes, unasRes] = await Promise.all([
        api.getOfficials(),
        api.getUnassignedCases()
      ]);
      if (offRes.success) setOfficials(offRes.data);
      if (unasRes.success) setUnassignedCases(unasRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load officials workload data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloadData();
  }, []);

  const handleUpdateLimit = async (e) => {
    e.preventDefault();
    if (!editingOfficial) return;
    try {
      const res = await api.updateOfficialLimit(editingOfficial.id, newLimit);
      if (res.success) {
        showToast(res.message, 'success');
        setEditingOfficial(null);
        fetchWorkloadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleAvailability = async (official, newStatus) => {
    try {
      const res = await api.updateOfficialAvailability(official.id, newStatus);
      if (res.success) {
        showToast(`Official ${official.name} status updated to "${newStatus}".`, 'success');
        fetchWorkloadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const runSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await api.previewAssignment({ department: simDept, category: simCategory });
      if (res.success) {
        setSimResult(res.preview);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Official Workload Capacity & Smart Routing Matrix (UVP 1)"
        subtitle="Monitors active complaint loads, calibrates individual capacity limits, and enforces automated workload balancing."
        badge={`${officials.length} Registered Officials`}
        breadcrumbs={[{ label: 'Entities' }, { label: 'Officials & Workload' }]}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/unassigned">
              <Button
                variant={unassignedCases.length > 0 ? 'primary' : 'secondary'}
                size="md"
                icon={AlertOctagon}
              >
                Unassigned Queue ({unassignedCases.length})
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              onClick={fetchWorkloadData}
            >
              Refresh Matrix
            </Button>
          </div>
        }
      />

      {/* Interactive Simulator Bench (Clean Government Styled Panel) */}
      <div className="bg-white border border-gov-border rounded-xs shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gov-border pb-2">
          <div>
            <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-gov-navy" />
              <span>Automated Assignment Algorithm Simulator</span>
            </h2>
            <p className="text-xxs text-gov-textLight mt-0.5">
              Simulate how the routing engine matches bureau eligibility, respects capacity limits, and selects the lowest workload ratio.
            </p>
          </div>
          <span className="text-xxs font-mono text-gov-textLight">Deterministic Rule Evaluation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <FormField label="Bureau / Directorate" id="simDept">
            <select
              id="simDept"
              value={simDept}
              onChange={(e) => setSimDept(e.target.value)}
              className="w-full bg-white border border-gov-border rounded-xs p-2 text-gov-text"
            >
              <option value="Regulation Bureau (RB)">Regulation Bureau (RB)</option>
              <option value="Public Grievance Redressal Cell (PGRC)">Public Grievance Redressal Cell (PGRC)</option>
              <option value="Approval Bureau (AB)">Approval Bureau (AB)</option>
              <option value="Faculty Development Cell (FDC)">Faculty Development Cell (FDC)</option>
            </select>
          </FormField>

          <FormField label="Grievance Category" id="simCategory">
            <select
              id="simCategory"
              value={simCategory}
              onChange={(e) => setSimCategory(e.target.value)}
              className="w-full bg-white border border-gov-border rounded-xs p-2 text-gov-text"
            >
              <option value="Faculty Salary & Non-Payment">Faculty Salary & Non-Payment</option>
              <option value="Faculty Qualifications & Ghost Faculty">Faculty Qualifications & Ghost Faculty</option>
              <option value="Capitation Fee & Refund">Capitation Fee & Refund</option>
              <option value="Infrastructure & Lab Deficiencies">Infrastructure & Lab Deficiencies</option>
              <option value="Admission Malpractice">Admission Malpractice</option>
              <option value="Ragging & Harassment">Ragging & Harassment</option>
              <option value="Approval Norms Violation">Approval Norms Violation</option>
              <option value="Faculty Service Conditions">Faculty Service Conditions</option>
              <option value="Safety Norms">Safety Norms</option>
            </select>
          </FormField>

          <div className="flex items-end">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              loading={simLoading}
              onClick={runSimulation}
            >
              Execute Routing Simulation
            </Button>
          </div>
        </div>

        {/* Simulation Output Box */}
        {simResult && (
          <div className="p-3 bg-gov-bg border border-gov-border rounded-xs text-xs space-y-1.5 animate-in fade-in">
            {simResult.status === 'ASSIGNED' ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-status-disposed" />
                  <span className="font-semibold text-gov-text">Eligible Official Selected:</span>
                  <strong className="text-gov-navy text-sm font-bold">{simResult.official?.name}</strong>
                  <span className="text-xxs text-gov-textLight">({simResult.official?.designation})</span>
                </div>
                <div className="p-2 bg-white border border-gov-borderLight rounded-xs font-mono text-xxs text-gov-textMuted leading-relaxed">
                  Rationale: {simResult.explanation}
                </div>
              </div>
            ) : (
              <div className="p-2 bg-amber-50 border border-amber-300 rounded-xs text-amber-950">
                <strong className="block mb-0.5 text-xs text-amber-900">Routing to Unassigned Queue:</strong>
                <p className="text-xxs text-amber-900 font-mono leading-relaxed">{simResult.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Officials Roster Table */}
      <div className="bg-white border border-gov-border rounded-xs shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gov-border pb-2">
          <div>
            <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
              Bureau Officials Capacity Roster & Limits
            </h2>
            <p className="text-xxs text-gov-textLight mt-0.5">
              Live capacity utilization calculated dynamically from non-disposed active complaints.
            </p>
          </div>
          <span className="text-xxs text-gov-textLight">
            {user?.role === 'admin' ? 'Click "Edit Limit" to calibrate capacity' : 'Read-only capacity view'}
          </span>
        </div>

        {loading ? (
          <TableSkeleton columns={7} rows={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left gov-table">
              <thead>
                <tr>
                  <th className="w-20">ID</th>
                  <th>Official Name & Designation</th>
                  <th className="w-44">Bureau</th>
                  <th>Subject Matter Expertise</th>
                  <th className="w-28 text-center">Availability</th>
                  <th className="w-44">Active / Max Workload</th>
                  <th className="w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {officials.map((off) => {
                  const pct = Math.round(((off.activeCasesCount || 0) / (off.maxActiveCases || 10)) * 100);
                  const isFull = (off.activeCasesCount || 0) >= off.maxActiveCases;
                  const isLeave = off.availabilityStatus !== 'Available';

                  return (
                    <tr key={off.id} className={isFull ? 'bg-red-50/20' : ''}>
                      <td className="font-mono font-bold text-gov-navy text-xs">{off.id}</td>
                      <td>
                        <div className="font-bold text-gov-text text-xs">{off.name}</div>
                        <div className="text-xxs text-gov-textLight">{off.designation}</div>
                      </td>
                      <td className="text-gov-textMuted font-medium text-xs">
                        {off.department}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {off.expertiseCategories?.map((exp, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xs font-medium">
                              {exp}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-center">
                        <select
                          value={off.availabilityStatus}
                          onChange={(e) => handleToggleAvailability(off, e.target.value)}
                          className={`text-xxs font-bold px-2 py-0.5 rounded-xs border cursor-pointer uppercase ${
                            off.availabilityStatus === 'Available'
                              ? 'bg-emerald-50 text-status-disposed border-emerald-300'
                              : off.availabilityStatus === 'On Leave'
                              ? 'bg-red-50 text-status-overdue border-red-300'
                              : 'bg-amber-50 text-status-pending border-amber-300'
                          }`}
                        >
                          <option value="Available">Available</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Busy">Busy</option>
                          <option value="Unavailable">Unavailable</option>
                        </select>
                      </td>
                      <td>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono font-bold text-gov-text">
                            {off.activeCasesCount || 0} / {off.maxActiveCases} <span className="font-normal text-xxs text-gov-textLight">cases</span>
                          </span>
                          <span className={`font-mono font-bold text-xxs ${
                            pct >= 100 ? 'text-status-overdue' : pct >= 75 ? 'text-status-pending' : 'text-gov-navy'
                          }`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-none overflow-hidden">
                          <div
                            className={`h-full ${
                              pct >= 100 ? 'bg-status-overdue' : pct >= 75 ? 'bg-status-pending' : 'bg-gov-navy'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </td>
                      <td className="text-right">
                        {(user?.role === 'admin' || user?.role === 'senior_officer') ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Sliders}
                            onClick={() => {
                              setEditingOfficial(off);
                              setNewLimit(off.maxActiveCases);
                            }}
                          >
                            Edit
                          </Button>
                        ) : (
                          <span className="text-xxs text-gov-textLight font-mono">View</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Limit Modal */}
      {editingOfficial && (
        <Modal
          isOpen={!!editingOfficial}
          onClose={() => setEditingOfficial(null)}
          title={`Configure Max Workload Limit: ${editingOfficial.name}`}
          subtitle={`Department: ${editingOfficial.department} • Active Cases: ${editingOfficial.activeCasesCount}`}
        >
          <form onSubmit={handleUpdateLimit} className="space-y-3.5 text-xs">
            <p className="text-gov-textMuted leading-relaxed">
              Define the maximum active case threshold this officer can hold concurrently before auto-routing diverts complaints to other eligible colleagues or the unassigned queue.
            </p>

            <FormField label="Maximum Active Non-Disposed Cases (1 - 50)" required id="newLimit">
              <input
                id="newLimit"
                type="number"
                min="1"
                max="50"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="w-full text-sm bg-white border border-gov-border rounded-xs p-2 font-mono font-bold focus:ring-1 focus:ring-gov-navy"
                required
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
              <Button variant="secondary" size="md" onClick={() => setEditingOfficial(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit">
                Save Capacity Threshold
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Modal from Queue */}
      {assigningCase && (
        <AssignModal
          isOpen={!!assigningCase}
          onClose={() => setAssigningCase(null)}
          currentCase={assigningCase}
          onAssigned={() => {
            fetchWorkloadData();
          }}
        />
      )}

      {/* Case Detail Modal */}
      {viewingCaseId && (
        <CaseDetailModal
          isOpen={!!viewingCaseId}
          onClose={() => setViewingCaseId(null)}
          caseId={viewingCaseId}
          onCaseUpdated={fetchWorkloadData}
        />
      )}
    </div>
  );
};
