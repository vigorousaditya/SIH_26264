import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FormField } from '../common/FormField';
import { api } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, UserCheck } from 'lucide-react';

export const AssignModal = ({ isOpen, onClose, currentCase, onAssigned }) => {
  const { user } = useAuth();
  const { showToast } = useAlert();
  const [officials, setOfficials] = useState([]);
  const [selectedOfficialId, setSelectedOfficialId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOfficials();
      setSelectedOfficialId(currentCase?.assignedOfficialId || '');
    }
  }, [isOpen, currentCase]);

  const loadOfficials = async () => {
    try {
      const res = await api.getOfficials();
      if (res.success) setOfficials(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentCase) return null;

  const selectedOfficial = officials.find(o => o.id === selectedOfficialId);
  const isOverLimit = selectedOfficial && selectedOfficial.activeCasesCount >= selectedOfficial.maxActiveCases;
  const isUnavailable = selectedOfficial && selectedOfficial.availabilityStatus !== 'Available';
  const needsOverride = isOverLimit || isUnavailable;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOfficialId) {
      showToast('Please select an official from the roster.', 'warning');
      return;
    }

    if (needsOverride && !overrideReason.trim()) {
      showToast('An administrative override reason is mandatory when assigning an officer at limit or on leave.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.assignCase(currentCase.id, {
        officialId: selectedOfficialId,
        overrideReason: overrideReason.trim()
      });

      if (res.success) {
        showToast(res.message, 'success');
        onAssigned(res.data);
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
      title={`Reassign Official: ${currentCase.id}`}
      subtitle={`${currentCase.institutionName} • ${currentCase.category}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="bg-gov-bg p-2.5 border border-gov-border rounded-xs text-xs flex items-center justify-between">
          <div>
            <span className="text-gov-textLight">Currently Designated: </span>
            <strong className="text-gov-navy">{currentCase.assignedOfficialName || 'Unassigned Queue'}</strong>
          </div>
          <span className="text-xxs text-gov-textLight font-mono">Bureau: {currentCase.department}</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gov-text mb-1.5">
            Select Bureau Official from Capacity Roster *
          </label>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 border border-gov-border rounded-xs p-1 bg-gov-bg">
            {officials.map(o => {
              const pct = Math.round((o.activeCasesCount / o.maxActiveCases) * 100);
              const isFull = o.activeCasesCount >= o.maxActiveCases;
              const isLeave = o.availabilityStatus !== 'Available';

              return (
                <label
                  key={o.id}
                  className={`flex items-center justify-between p-2.5 rounded-xs border cursor-pointer transition-colors text-xs ${
                    selectedOfficialId === o.id
                      ? 'border-gov-navy bg-white ring-1 ring-gov-navy'
                      : 'border-gov-border bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="official"
                      value={o.id}
                      checked={selectedOfficialId === o.id}
                      onChange={() => setSelectedOfficialId(o.id)}
                      className="text-gov-navy focus:ring-gov-navy"
                    />
                    <div>
                      <div className="font-bold text-gov-text flex items-center gap-2">
                        {o.name}
                        {isLeave && (
                          <span className="text-xxs font-bold px-1 py-0.2 rounded-xs bg-red-100 text-red-800 border border-red-200 uppercase">
                            {o.availabilityStatus}
                          </span>
                        )}
                        {isFull && (
                          <span className="text-xxs font-bold px-1 py-0.2 rounded-xs bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                            100% Capacity
                          </span>
                        )}
                      </div>
                      <div className="text-xxs text-gov-textLight">{o.department} • {o.designation}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-gov-text">
                      {o.activeCasesCount} / {o.maxActiveCases} <span className="text-xxs font-normal text-gov-textLight">cases ({pct}%)</span>
                    </div>
                    <div className="w-20 bg-slate-200 h-1.5 rounded-none mt-1 overflow-hidden">
                      <div
                        className={`h-full ${pct >= 100 ? 'bg-status-overdue' : pct >= 75 ? 'bg-status-pending' : 'bg-gov-navy'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {needsOverride && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xs text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Supervisor Override Justification Required</span>
            </div>
            <p className="text-xxs text-amber-900 leading-relaxed">
              Selected officer is {isOverLimit ? 'at maximum configured capacity threshold' : ''}
              {isOverLimit && isUnavailable ? ' and ' : ''}
              {isUnavailable ? `currently marked as ${selectedOfficial.availabilityStatus}` : ''}.
              This assignment will be logged into the audit ledger.
            </p>
            <input
              type="text"
              placeholder="Mandatory administrative justification reason..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full text-xs bg-white border border-amber-300 rounded-xs p-2 focus:ring-1 focus:ring-amber-600"
              required
            />
          </div>
        )}

        {!needsOverride && (
          <FormField label="Reassignment Remark (Optional)" id="overrideReason">
            <input
              id="overrideReason"
              type="text"
              placeholder="e.g. Workload redistribution or specialized subject matter expertise"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy"
            />
          </FormField>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" loading={loading}>
            Confirm Reassignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
