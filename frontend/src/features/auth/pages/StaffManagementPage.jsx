import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllStaff, provisionStaff, updateStaff, updateStaffStatus } from '../api/staffApi';
import '../auth.css';

const ALLOWED_STAFF_ROLES = [
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'DENTIST', label: 'Dentist' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'DENTAL_ASSISTANT', label: 'Dental Assistant' }
];

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals / forms state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // New staff form data
  const [newStaff, setNewStaff] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'DENTIST',
    password: ''
  });

  // Edit staff form data
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    role: 'DENTIST'
  });

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllStaff();
      setStaffList(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load staff members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    setActionSuccess('');

    try {
      await provisionStaff(newStaff);
      setShowCreateModal(false);
      setNewStaff({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'DENTIST',
        password: ''
      });
      setActionSuccess('Staff account provisioned successfully.');
      await loadStaff();
    } catch (err) {
      setFormError(err.message || 'Failed to provision staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    setFormError('');
    setSubmitting(true);
    setActionSuccess('');

    try {
      await updateStaff(editingStaff.id, editData);
      setEditingStaff(null);
      setActionSuccess('Staff details updated successfully.');
      await loadStaff();
    } catch (err) {
      setFormError(err.message || 'Failed to update staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff) => {
    setActionSuccess('');
    setError(null);
    try {
      const newStatus = !staff.active;
      await updateStaffStatus(staff.id, newStatus);
      setActionSuccess(
        `Staff account ${newStatus ? 'activated' : 'deactivated'} successfully.`
      );
      await loadStaff();
    } catch (err) {
      setError(err.message || 'Failed to update account status.');
    }
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setEditData({
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      phone: staff.phone || '',
      role: staff.role || 'DENTIST'
    });
    setFormError('');
  };

  const filteredStaff = staffList.filter((staff) => {
    const fullName = `${staff.firstName} ${staff.lastName}`.toLowerCase();
    const emailMatch = (staff.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatch = fullName.includes(searchTerm.toLowerCase());
    const matchesSearch = !searchTerm || nameMatch || emailMatch;
    const matchesRole = !roleFilter || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="staff-container">
      <nav className="inventory-nav" aria-label="Breadcrumb">
        <Link to="/">&larr; Back to Home</Link>
      </nav>

      <div className="staff-header">
        <div>
          <h1>Staff Account Management</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
            Administrator portal to provision, manage roles, and toggle clinical and reception staff status.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setShowCreateModal(true);
            setFormError('');
          }}
        >
          + Provision New Staff
        </button>
      </div>

      {actionSuccess && (
        <div className="success-alert" role="status" style={{ marginBottom: '1rem' }}>
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="error-alert" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="staff-actions-bar">
        <input
          type="search"
          className="staff-search-input"
          placeholder="Search staff by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search staff"
        />

        <select
          className="staff-role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          {ALLOWED_STAFF_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-state" role="status">
          Loading staff members...
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="empty-state" data-testid="empty-staff-state">
          <h3>No Staff Accounts Found</h3>
          <p>
            {searchTerm || roleFilter
              ? 'No staff members match your filter criteria.'
              : 'No staff members have been provisioned yet.'}
          </p>
          {(searchTerm || roleFilter) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table" aria-label="Staff accounts table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff) => (
                <tr key={staff.id}>
                  <td style={{ fontWeight: 600 }}>
                    {staff.firstName} {staff.lastName}
                  </td>
                  <td>{staff.email}</td>
                  <td>{staff.phone || '—'}</td>
                  <td>
                    <span className="role-badge">{staff.role}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${staff.active ? 'badge-active' : 'badge-inactive'}`}
                    >
                      {staff.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(staff)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${staff.active ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => handleToggleStatus(staff)}
                        aria-label={`${staff.active ? 'Deactivate' : 'Activate'} ${staff.firstName} ${staff.lastName}`}
                      >
                        {staff.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Provision Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="create-modal-title">Provision New Staff Member</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="error-alert" role="alert" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="staff-first-name">
                    First Name <span className="required-indicator">*</span>
                  </label>
                  <input
                    id="staff-first-name"
                    type="text"
                    required
                    value={newStaff.firstName}
                    onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="staff-last-name">
                    Last Name <span className="required-indicator">*</span>
                  </label>
                  <input
                    id="staff-last-name"
                    type="text"
                    required
                    value={newStaff.lastName}
                    onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="staff-email">
                    Email Address <span className="required-indicator">*</span>
                  </label>
                  <input
                    id="staff-email"
                    type="email"
                    required
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="staff-phone">Phone Number</label>
                  <input
                    id="staff-phone"
                    type="text"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    placeholder="e.g. +1 555-0100"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="staff-role">
                    Staff Role <span className="required-indicator">*</span>
                  </label>
                  <select
                    id="staff-role"
                    required
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  >
                    {ALLOWED_STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="staff-password">
                    Temporary Password <span className="required-indicator">*</span>
                  </label>
                  <input
                    id="staff-password"
                    type="password"
                    required
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Provisioning...' : 'Provision Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStaff && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="edit-modal-title">Edit Staff Account</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingStaff(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="error-alert" role="alert" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Email Address (Immutable)</label>
                  <input type="text" value={editingStaff.email} disabled />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="edit-first-name">
                    First Name <span className="required-indicator">*</span>
                  </label>
                  <input
                    id="edit-first-name"
                    type="text"
                    required
                    value={editData.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="edit-last-name">
                    Last Name <span className="required-indicator">*</span>
                  </label>
                  <input
                    id="edit-last-name"
                    type="text"
                    required
                    value={editData.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="edit-phone">Phone Number</label>
                  <input
                    id="edit-phone"
                    type="text"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="edit-role">
                    Staff Role <span className="required-indicator">*</span>
                  </label>
                  <select
                    id="edit-role"
                    required
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  >
                    {ALLOWED_STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingStaff(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
