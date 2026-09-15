import React, { useState, useEffect } from 'react';
import { Users, Plus, Calculator, MapPin, Home } from 'lucide-react';
import { api } from '../services/api.js';
import { Lead } from '../types.js';

interface LeadsViewProps {
  currentUser?: User | null;
  onSelectLeadForCalc: (lead: Lead) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({ currentUser, onSelectLeadForCalc }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Lead Form State
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postcode, setPostcode] = useState('');
  const [epcFloorArea, setEpcFloorArea] = useState<number>(100);
  const [propertyType, setPropertyType] = useState('Semi detached');
  const [epcRating, setEpcRating] = useState('D');

  const fetchLeads = async () => {
    try {
      const res = await api.getLeads();
      setLeads(res.leads || []);
    } catch (err) {
      console.error('Failed to load leads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const canEdit = currentUser && currentUser.role_name !== 'READ_ONLY';

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert('Authentication required: Creating leads requires a logged-in account with write permissions (Sales, Surveyor, Estimator, or Admin).');
      return;
    }
    try {
      const res = await api.createLead({
        customerName,
        email,
        phone,
        addressLine1,
        postcode,
        epcFloorArea: Number(epcFloorArea),
        propertyType,
        epcRating
      });
      if (res.error) {
        alert('Failed to add lead: ' + res.error);
        return;
      }
      setShowAddModal(false);
      // Reset
      setCustomerName('');
      setEmail('');
      setPhone('');
      setAddressLine1('');
      setPostcode('');
      fetchLeads();
    } catch (err: any) {
      alert('Failed to add lead: ' + err.message);
    }
  };


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Registered Property Leads
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Customer pipeline, building fabric profiles, and survey status tracking.
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Add New Property Lead
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Address & Postcode</th>
                <th>Type & Area</th>
                <th>EPC</th>
                <th>Boiler & Pipework</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 700 }}>{l.reference_no}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.customer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.email || l.phone || 'No contact info'}</div>
                  </td>
                  <td>
                    <div>{l.address_line1}</div>
                    <div className="font-mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.postcode}</div>
                  </td>
                  <td>
                    <div>{l.property_type}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.epc_floor_area} m² ({l.bedrooms || 3} bed)</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontWeight: 800 }}>
                      Band {l.epc_rating || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div>{l.boiler_type || 'Combi'}</div>
                    <div style={{ fontSize: '0.75rem', color: l.existing_pipework?.includes('Microbore') ? '#b91c1c' : '#64748b', fontWeight: l.existing_pipework?.includes('Microbore') ? 700 : 400 }}>
                      {l.existing_pipework || 'Standard 15mm+'}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">{l.status}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => onSelectLeadForCalc(l)}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    >
                      <Calculator size={13} /> Calculate
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No property leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="card-header">
              <h3 className="card-title">Register New Customer Lead</h3>
            </div>
            <form onSubmit={handleAddLead}>
              <div className="form-grid" style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input className="form-control" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Postcode *</label>
                  <input className="form-control font-mono" required value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Property Address *</label>
                <input className="form-control" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
              </div>

              <div className="form-grid" style={{ marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Property Type</label>
                  <select className="form-control" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    <option value="Semi detached">Semi detached</option>
                    <option value="Detached">Detached</option>
                    <option value="End terrace">End terrace</option>
                    <option value="Mid terrace">Mid terrace</option>
                    <option value="Bungalow">Bungalow</option>
                    <option value="Flat">Flat</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">EPC Rating</label>
                  <select className="form-control" value={epcRating} onChange={(e) => setEpcRating(e.target.value)}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Floor Area m²</label>
                  <input className="form-control" type="number" value={epcFloorArea} onChange={(e) => setEpcFloorArea(Number(e.target.value))} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Lead Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
