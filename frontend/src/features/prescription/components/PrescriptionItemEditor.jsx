import React from 'react';

/**
 * Editor for multiple prescription medicine items with field validation.
 */
export default function PrescriptionItemEditor({
  items = [],
  onChange,
  errors = {},
  disabled = false
}) {
  const handleItemChange = (index, field, value) => {
    const updated = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onChange(updated);
  };

  const handleAddItem = () => {
    onChange([
      ...items,
      {
        medicineName: '',
        strength: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: 1,
        instructions: ''
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      return; // Keep at least one template item
    }
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="medicine-items-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
          Prescription Medicines ({items.length})
        </h3>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleAddItem}
          disabled={disabled}
        >
          + Add Another Medicine
        </button>
      </div>

      {errors.items && (
        <div className="field-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
          {errors.items}
        </div>
      )}

      {items.map((item, index) => {
        const itemError = errors[`item_${index}`] || {};

        return (
          <div key={index} className="item-card">
            <div className="item-card-header">
              <span>Medicine #{index + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemoveItem(index)}
                  disabled={disabled}
                  aria-label={`Remove medicine #${index + 1}`}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="item-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label htmlFor={`med_name_${index}`}>
                  Medicine Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id={`med_name_${index}`}
                  type="text"
                  placeholder="e.g. Amoxicillin, Ibuprofen"
                  value={item.medicineName || ''}
                  onChange={(e) => handleItemChange(index, 'medicineName', e.target.value)}
                  disabled={disabled}
                  className={itemError.medicineName ? 'has-error' : ''}
                />
                {itemError.medicineName && <span className="field-error">{itemError.medicineName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor={`med_strength_${index}`}>Strength</label>
                <input
                  id={`med_strength_${index}`}
                  type="text"
                  placeholder="e.g. 500mg, 250mg/5ml"
                  value={item.strength || ''}
                  onChange={(e) => handleItemChange(index, 'strength', e.target.value)}
                  disabled={disabled}
                />
              </div>

              <div className="form-group">
                <label htmlFor={`med_dosage_${index}`}>
                  Dosage <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id={`med_dosage_${index}`}
                  type="text"
                  placeholder="e.g. 1 tablet, 5ml"
                  value={item.dosage || ''}
                  onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                  disabled={disabled}
                  className={itemError.dosage ? 'has-error' : ''}
                />
                {itemError.dosage && <span className="field-error">{itemError.dosage}</span>}
              </div>

              <div className="form-group">
                <label htmlFor={`med_frequency_${index}`}>
                  Frequency <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id={`med_frequency_${index}`}
                  type="text"
                  placeholder="e.g. 3 times daily, Every 8 hours"
                  value={item.frequency || ''}
                  onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                  disabled={disabled}
                  className={itemError.frequency ? 'has-error' : ''}
                />
                {itemError.frequency && <span className="field-error">{itemError.frequency}</span>}
              </div>

              <div className="form-group">
                <label htmlFor={`med_duration_${index}`}>
                  Duration <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id={`med_duration_${index}`}
                  type="text"
                  placeholder="e.g. 5 days, 1 week"
                  value={item.duration || ''}
                  onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                  disabled={disabled}
                  className={itemError.duration ? 'has-error' : ''}
                />
                {itemError.duration && <span className="field-error">{itemError.duration}</span>}
              </div>

              <div className="form-group">
                <label htmlFor={`med_quantity_${index}`}>
                  Quantity <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id={`med_quantity_${index}`}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Total units"
                  value={item.quantity ?? ''}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  disabled={disabled}
                  className={itemError.quantity ? 'has-error' : ''}
                />
                {itemError.quantity && <span className="field-error">{itemError.quantity}</span>}
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor={`med_instructions_${index}`}>Special Instructions</label>
                <textarea
                  id={`med_instructions_${index}`}
                  rows={2}
                  placeholder="e.g. Take with or immediately after food. Avoid dairy products."
                  value={item.instructions || ''}
                  onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
