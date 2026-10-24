import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FormField } from '../common/FormField';
import { api } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertTriangle, ShieldCheck, UserCheck } from 'lucide-react';

const CATEGORIES = [
  'Faculty Salary & Non-Payment',
  'Capitation Fee & Refund',
  'Infrastructure & Lab Deficiencies',
  'Admission Malpractice',
  'Faculty Qualifications & Ghost Faculty',
  'Examination & Grading Irregularities',
  'Approval Norms Violation',
  'Ragging & Harassment',
  'Faculty Service Conditions'
];

const DEPARTMENTS = [
  'Regulation Bureau (RB)',
  'Public Grievance Redressal Cell (PGRC)',
  'Approval Bureau (AB)',
  'Faculty Development Cell (FDC)'
];

export const RegisterCaseModal = ({ isOpen, onClose, onCaseRegistered }) => {
  const { user } = useAuth();
  const { showToast } = useAlert();
  const [institutions, setInstitutions] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [assignmentPreview, setAssignmentPreview] = useState(null);

  const [formData, setFormData] = useState({
    institutionId: '',
    department: 'Regulation Bureau (RB)',
    category: 'Faculty Salary & Non-Payment',
    priority: 'Medium',
    complainantName: '',
    complainantType: 'Faculty',
    description: '',
    daysToDisposal: 15,
    isManualOverride: false,
    manualOfficialId: '',
    overrideReason: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    try {
      const [instRes, offRes] = await Promise.all([
        api.getInstitutions(),
        api.getOfficials()
      ]);
      if (instRes.success) setInstitutions(instRes.data);
      if (offRes.success) setOfficials(offRes.data);
      if (instRes.data?.length > 0 && !formData.institutionId) {
        setFormData(prev => ({ ...prev, institutionId: instRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run preview when department or category changes
  useEffect(() => {
    if (formData.department && formData.category && isOpen) {
      fetchAssignmentPreview();
    }
  }, [formData.department, formData.category, isOpen]);

  const fetchAssignmentPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await api.previewAssignment({
        department: formData.department,
        category: formData.category
      });
      if (res.success) {
        setAssignmentPreview(res.preview);
      }
    } catch (err) {
      console.error('Assignment preview failed:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.institutionId || !formData.description) {
      showToast('Please select an institution and describe the grievance facts.', 'warning');
      return;
    }

    if (formData.isManualOverride && !formData.overrideReason) {
      showToast('Please provide an override reason for manual supervisor assignment.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        institutionId: formData.institutionId,
        department: formData.department,
        category: formData.category,
        priority: formData.priority,
        complainantName: formData.complainantName || 'Confidential Complainant',
        complainantType: formData.complainantType,
        description: formData.description,
        daysToDisposal: Number(formData.daysToDisposal) || 15,
        manualOfficialId: formData.isManualOverride ? formData.manualOfficialId : null,
        overrideReason: formData.isManualOverride ? formData.overrideReason : ''
      };

      const res = await api.registerCase(payload);
      if (res.success) {
        showToast(`Complaint registered successfully as Case ID ${res.data.id}.`, 'success');
        onCaseRegistered(res.data);
        onClose();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Register New Institution Complaint"
      subtitle="Intake form with automated bureau routing and workload cap verification."
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Institution & Department */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <FormField label="Target Approved Institution" required id="institutionId">
            <select
              id="institutionId"
              value={formData.institutionId}
              onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
              className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy"
              required
            >
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.permanentId})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Responsible Bureau / Department" required id="department">
            <select
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy"
              required
            >
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Row 2: Category & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="md:col-span-2">
            <FormField label="Grievance Category" required id="category">
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy"
                required
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div>
            <FormField label="Priority Classification" id="priority">
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical (Vigilance)</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* Row 3: Complainant details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="md:col-span-2">
            <FormField label="Complainant Name / Delegation" id="complainantName">
              <input
                id="complainantName"
                type="text"
                placeholder="e.g. Dr. A. Sharma or Confidential Delegation"
                value={formData.complainantName}
                onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy"
              />
            </FormField>
          </div>

          <div>
            <FormField label="Complainant Type" id="complainantType">
              <select
                id="complainantType"
                value={formData.complainantType}
                onChange={(e) => setFormData({ ...formData, complainantType: e.target.value })}
                className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy"
              >
                <option value="Faculty">Faculty Member</option>
                <option value="Student">Student</option>
                <option value="Parent">Parent / Guardian</option>
                <option value="Anonymous">Anonymous / Whistleblower</option>
                <option value="Public Representative">Public Representative</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* Description */}
        <FormField label="Grievance Particulars & Regulatory Non-Compliance Facts" required id="description">
          <textarea
            id="description"
            rows={3}
            placeholder="Provide specific factual summary, dates of non-payment or infraction, affected student batches, and relevant regulatory clauses..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full text-xs bg-white border border-gov-border rounded-xs p-2.5 focus:ring-1 focus:ring-gov-navy"
            required
          />
        </FormField>

        {/* UVP 1 Smart Assignment Live Preview Box (Clean Sober Government Panel) */}
        <div className="p-3 rounded-xs border border-gov-border bg-gov-bg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xxs font-bold uppercase tracking-wider text-gov-navy flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gov-navy" />
              Automated Workload Routing Preview (UVP 1)
            </span>
            {previewLoading && (
              <span className="text-xxs text-gov-textLight font-mono">Evaluating...</span>
            )}
          </div>

          {assignmentPreview ? (
            <div className="text-xs">
              {assignmentPreview.status === 'ASSIGNED' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gov-text">Designated Official:</span>
                    <strong className="text-gov-navy">{assignmentPreview.official?.name}</strong>
                    <span className="text-xxs text-gov-textLight font-mono">
                      ({assignmentPreview.official?.activeCasesCount} of {assignmentPreview.official?.maxActiveCases} cases active)
                    </span>
                  </div>
                  <p className="text-[11px] text-gov-textMuted bg-white p-2 border border-gov-borderLight rounded-xs font-mono leading-relaxed">
                    Justification: {assignmentPreview.explanation}
                  </p>
                </div>
              ) : (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xs text-xs text-amber-900">
                  <strong className="block mb-0.5">Will Enter Unassigned Queue:</strong>
                  {assignmentPreview.explanation}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xxs text-gov-textLight italic">
              Select department and category to simulate automated assignment.
            </p>
          )}
        </div>

        {/* Manual Override Checkbox */}
        <div className="pt-2 border-t border-gov-border">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gov-text">
            <input
              type="checkbox"
              id="manualOverride"
              checked={formData.isManualOverride}
              onChange={(e) => setFormData({ ...formData, isManualOverride: e.target.checked })}
              className="rounded-xs text-gov-saffron focus:ring-gov-saffron"
            />
            <span>Supervisor Discretionary / Manual Assignment Override</span>
          </label>

          {formData.isManualOverride && (
            <div className="mt-2.5 p-3 bg-amber-50/50 border border-amber-200 rounded-xs grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <FormField label="Target Official" required id="manualOfficialId">
                <select
                  id="manualOfficialId"
                  value={formData.manualOfficialId}
                  onChange={(e) => setFormData({ ...formData, manualOfficialId: e.target.value })}
                  className="w-full text-xs bg-white border border-gov-border rounded-xs p-1.5"
                  required={formData.isManualOverride}
                >
                  <option value="">Select official...</option>
                  {officials.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.department}) — {o.activeCasesCount}/{o.maxActiveCases} cases [{o.availabilityStatus}]
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Mandatory Administrative Justification" required id="overrideReason">
                <input
                  id="overrideReason"
                  type="text"
                  placeholder="e.g. Authorized by Member Secretary for immediate inquiry"
                  value={formData.overrideReason}
                  onChange={(e) => setFormData({ ...formData, overrideReason: e.target.value })}
                  className="w-full text-xs bg-white border border-gov-border rounded-xs p-1.5"
                  required={formData.isManualOverride}
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" loading={loading}>
            Register Complaint
          </Button>
        </div>
      </form>
    </Modal>
  );
};
