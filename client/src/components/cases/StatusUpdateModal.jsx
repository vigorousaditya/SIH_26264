import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FormField } from '../common/FormField';
import { api } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { AlertCircle, Network, Info } from 'lucide-react';

export const StatusUpdateModal = ({ isOpen, onClose, currentCase, onUpdated }) => {
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentCase?.status || 'Under Process');
  const [remarks, setRemarks] = useState('');
  const [nextAction, setNextAction] = useState(currentCase?.nextAction || '');
  const [findings, setFindings] = useState(currentCase?.findings || '');
  const [disposalRemarks, setDisposalRemarks] = useState(currentCase?.disposalRemarks || '');

  if (!currentCase) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      showToast('Please provide administrative remarks for this status change.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.updateCaseStatus(currentCase.id, {
        status,
        remarks: remarks.trim(),
        nextAction,
        findings: findings.trim(),
        disposalRemarks: status === 'Disposed' ? (disposalRemarks || remarks) : ''
      });

      if (res.success) {
        showToast(res.message, 'success');
        if (res.impactAlertsGenerated > 0) {
          showToast(`UVP 3: ${res.impactAlertsGenerated} coordination impact alert(s) generated for connected cases.`, 'warning');
        }
        onUpdated(res.data);
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
      title={`Update Procedural Status: ${currentCase.id}`}
      subtitle={`${currentCase.institutionName} • Bureau: ${currentCase.department}`}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <FormField label="Target Case Status" required id="status">
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 font-semibold"
          >
            <option value="Pending">Pending</option>
            <option value="Under Process">Under Process</option>
            <option value="Transferred">Transferred</option>
            <option value="Escalated">Escalated (Higher Oversight)</option>
            <option value="Disposed">Disposed (Case Closed)</option>
          </select>
        </FormField>

        {status === 'Escalated' && (
          <div className="p-2.5 bg-red-50 border border-red-300 rounded-xs flex items-start gap-2 text-xs text-red-950">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-red-900">Escalation Protocol Active:</strong>
              This case will be highlighted on the Senior Officer dashboard and automatically trigger cross-case dependency reviews.
            </div>
          </div>
        )}

        <FormField label="Inquiry Committee Observations / Verified Facts" id="findings">
          <textarea
            id="findings"
            rows={2}
            placeholder="Document verified inspection evidence, biometric discrepancy figures, or college compliance submissions..."
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy font-sans"
          />
        </FormField>

        <FormField label="Official Status Change Remarks" required id="remarks">
          <textarea
            id="remarks"
            rows={2}
            placeholder="Record the official administrative rationale for this status transition..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy font-sans"
            required
          />
        </FormField>

        <FormField label="Next Scheduled Procedural Action" id="nextAction">
          <input
            id="nextAction"
            type="text"
            placeholder="e.g. Issue Show Cause Notice or Await state university report"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy"
          />
        </FormField>

        {status === 'Disposed' && (
          <FormField label="Final Disposal Order & Compliance Summary" id="disposalRemarks">
            <textarea
              id="disposalRemarks"
              rows={2}
              placeholder="Record final resolution particulars, refund voucher numbers, or penalty order references..."
              value={disposalRemarks}
              onChange={(e) => setDisposalRemarks(e.target.value)}
              className="w-full text-xs bg-emerald-50/50 border border-emerald-300 rounded-xs p-2"
            />
          </FormField>
        )}

        {/* UVP 3 Change Impact Advisory Note */}
        <div className="p-2.5 bg-gov-bg border border-gov-border rounded-xs flex items-start gap-2 text-xxs text-gov-textMuted">
          <Network className="w-3.5 h-3.5 text-gov-navy shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Coordination Advisory (UVP 3):</strong> Updates recorded with verified findings or escalations will trigger procedural impact advisories to officials handling connected cases at this institution.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" loading={loading}>
            Save Status Transition
          </Button>
        </div>
      </form>
    </Modal>
  );
};
