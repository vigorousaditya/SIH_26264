import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  MapPin, 
  ExternalLink,
  RotateCcw
} from 'lucide-react';

const REGIONS = ['all', 'Northern', 'Southern', 'Western', 'Eastern', 'Central', 'South-Western'];

export const InstitutionDirectoryPage = () => {
  const { user } = useAuth();
  const { showToast } = useAlert();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  // Add Institution Modal (Admin)
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    permanentId: '',
    category: 'Engineering & Technology',
    region: 'Northern',
    state: '',
    city: '',
    address: '',
    principalName: '',
    contactEmail: '',
    contactPhone: ''
  });

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const query = `?search=${encodeURIComponent(search)}&region=${regionFilter}`;
      const res = await api.getInstitutions(query);
      if (res.success) {
        setInstitutions(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load institutions directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, [regionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInstitutions();
  };

  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.permanentId.trim()) {
      showToast('Name and Permanent AICTE ID are required.', 'warning');
      return;
    }

    try {
      const res = await api.createInstitution(formData);
      if (res.success) {
        showToast(`Institution record "${res.data.name}" added successfully.`, 'success');
        setShowAddModal(false);
        fetchInstitutions();
        setFormData({
          name: '',
          permanentId: '',
          category: 'Engineering & Technology',
          region: 'Northern',
          state: '',
          city: '',
          address: '',
          principalName: '',
          contactEmail: '',
          contactPhone: ''
        });
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="AICTE Approved Institutions Directory"
        subtitle="Permanent institution records and cross-bureau complaint aggregation across regional directorates."
        badge={`${institutions.length} Campuses`}
        breadcrumbs={[{ label: 'Entities' }, { label: 'Institutions' }]}
        actions={
          user?.role === 'admin' && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setShowAddModal(true)}
            >
              Add Fictional Institution
            </Button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 border border-gov-border rounded-xs shadow-card flex flex-col sm:flex-row items-center gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search institution name, Permanent AICTE ID, city, or state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gov-border rounded-xs focus:ring-1 focus:ring-gov-navy focus:border-gov-navy"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <label htmlFor="region-filter" className="text-gov-textMuted font-semibold flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Region:
          </label>
          <select
            id="region-filter"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-white border border-gov-border rounded-xs px-2 py-1 font-medium text-xs"
          >
            {REGIONS.map(r => (
              <option key={r} value={r}>
                {r === 'all' ? 'All AICTE Regions' : `${r} Region`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="bg-white border border-gov-border rounded-xs shadow-card overflow-hidden">
        {loading ? (
          <TableSkeleton columns={7} rows={8} />
        ) : institutions.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No institutions found"
            description="No technical campuses match the search criteria and regional filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left gov-table">
              <thead>
                <tr>
                  <th className="w-32">Permanent AICTE ID</th>
                  <th>Institution Name</th>
                  <th className="w-48">Region & Location</th>
                  <th className="w-24 text-center">Total Cases</th>
                  <th className="w-24 text-center">Active Cases</th>
                  <th className="w-24 text-center">Overdue</th>
                  <th className="w-32">Last Activity</th>
                  <th className="w-28 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr key={inst.id}>
                    <td className="font-mono font-bold text-gov-navy whitespace-nowrap">
                      {inst.permanentId}
                    </td>
                    <td>
                      <div className="font-bold text-gov-text">{inst.name}</div>
                      <div className="text-xxs text-gov-textLight">{inst.category} • {inst.accreditationStatus}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-gov-text text-xs">{inst.region} Region</div>
                      <div className="text-xxs text-gov-textLight">{inst.city}, {inst.state}</div>
                    </td>
                    <td className="text-center font-mono font-bold text-gov-text">
                      {inst.totalCases || 0}
                    </td>
                    <td className="text-center font-mono">
                      <span className={`px-1.5 py-0.2 rounded-xs text-xs font-bold ${
                        inst.pendingCases > 0 ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'text-slate-400'
                      }`}>
                        {inst.pendingCases || 0}
                      </span>
                    </td>
                    <td className="text-center font-mono">
                      {inst.overdueCases > 0 ? (
                        <span className="px-1.5 py-0.2 rounded-xs text-xs font-bold bg-red-100 text-status-overdue border border-red-200">
                          {inst.overdueCases}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="text-gov-textLight font-mono text-xxs">
                      {inst.lastActivityDate ? new Date(inst.lastActivityDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="text-right">
                      <Link to={`/institutions/${inst.id}`}>
                        <Button variant="secondary" size="sm" icon={ExternalLink} iconPosition="right">
                          Profile
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Institution Modal */}
      {showAddModal && (
        <Modal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          title="Register Fictional Institution (Admin Function)"
          subtitle="Add demo campus record for inter-bureau complaint coordination testing."
        >
          <form onSubmit={handleCreateInstitution} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Institution Name" required id="name">
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. Apex Institute of Technology & Management"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 focus:ring-1 focus:ring-gov-navy"
                  required
                />
              </FormField>

              <FormField label="Permanent AICTE ID" required id="permanentId">
                <input
                  id="permanentId"
                  type="text"
                  placeholder="e.g. 1-908877665"
                  value={formData.permanentId}
                  onChange={(e) => setFormData({ ...formData, permanentId: e.target.value })}
                  className="w-full text-xs bg-white border border-gov-border rounded-xs p-2 font-mono font-bold focus:ring-1 focus:ring-gov-navy"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField label="AICTE Region" required id="region">
                <select
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full text-xs bg-white border border-gov-border rounded-xs p-2"
                >
                  {REGIONS.filter(r => r !== 'all').map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="State" id="state">
                <input
                  id="state"
                  type="text"
                  placeholder="e.g. Uttar Pradesh"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full text-xs bg-white border border-gov-border rounded-xs p-2"
                />
              </FormField>

              <FormField label="City" id="city">
                <input
                  id="city"
                  type="text"
                  placeholder="e.g. Greater Noida"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full text-xs bg-white border border-gov-border rounded-xs p-2"
                />
              </FormField>
            </div>

            <FormField label="Campus Street Address" id="address">
              <input
                id="address"
                type="text"
                placeholder="Institutional premises street address..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs bg-white border border-gov-border rounded-xs p-2"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Director / Principal Name" id="principalName">
                <input
                  id="principalName"
                  type="text"
                  placeholder="e.g. Dr. R. K. Singhania"
                  value={formData.principalName}
                  onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  className="w-full text-xs bg-white border border-gov-border rounded-xs p-2"
                />
              </FormField>
              <FormField label="Institutional Contact Email" id="contactEmail">
                <input
                  id="contactEmail"
                  type="email"
                  placeholder="e.g. compliance@apexit.ac.in"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full text-xs bg-white border border-gov-border rounded-xs p-2"
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
              <Button variant="secondary" size="md" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit">
                Save Institution
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
