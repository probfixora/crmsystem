import React, { useState } from 'react';

/**
 * ManualTypeDropdown — reusable dropdown with "Manually Type" option.
 * When "Manually Type" is selected, a text input appears below for custom values.
 * The typed value is saved into the same field.
 *
 * Props:
 *   options      — Array of strings (the dropdown options)
 *   value        — Current field value (string)
 *   onChange     — (value: string) => void — called with the selected/typed value
 *   placeholder  — Dropdown placeholder text
 *   required     — Boolean
 *   style        — Additional style object for the select/input
 *   label        — Optional label string (for accessibility)
 *   id           — Optional HTML id
 */
const ManualTypeDropdown = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option',
  required = false,
  style = {},
  label,
  id,
  customLabel = 'Custom',
}) => {
  const isCustom = value !== '' && !options.includes(value);
  const [showManual, setShowManual] = useState(isCustom);
  const [manualValue, setManualValue] = useState(isCustom ? value : '');

  const selStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    background: 'var(--surface-2)',
    transition: 'all 0.2s',
    color: 'var(--text-1)',
    cursor: 'pointer',
    ...style,
  };

  const inpStyle = {
    width: '100%',
    padding: '10px 16px',
    border: '1.5px solid var(--color-primary)',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    background: 'var(--surface)',
    marginTop: 8,
    color: 'var(--text-1)',
    transition: 'all 0.2s',
    ...style,
  };

  const handleSelect = (e) => {
    const val = e.target.value;
    if (val === '__MANUAL__') {
      setShowManual(true);
      if (manualValue) {
        onChange(manualValue);
      } else {
        onChange('');
      }
    } else {
      setShowManual(false);
      setManualValue('');
      onChange(val);
    }
  };

  const handleManualChange = (e) => {
    const v = e.target.value;
    setManualValue(v);
    onChange(v);
  };

  const handleManualBlur = () => {
    if (!manualValue) return;
    
    // Check if the typed value matches any existing option (exact or with common units)
    const typed = manualValue.toLowerCase().trim();
    const match = options.find(opt => {
      const o = opt.toLowerCase();
      return o === typed || o === typed + 'kw' || o === typed + ' kw' || o === typed + ' w' || o === typed + ' w/p';
    });

    if (match) {
      setShowManual(false);
      setManualValue('');
      onChange(match);
    }
  };

  const selectValue = showManual ? '__MANUAL__' : (options.includes(value) ? value : '');

  return (
    <div style={{ position: 'relative' }}>
      <select
        id={id}
        aria-label={label || placeholder}
        style={selStyle}
        value={selectValue}
        onChange={handleSelect}
        required={required && !showManual}
      >
        <option value="">{placeholder}</option>
        <option value="__MANUAL__">{customLabel}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>

      {showManual && (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            style={inpStyle}
            value={manualValue}
            onChange={handleManualChange}
            onBlur={handleManualBlur}
            placeholder="Type custom value…"
            required={required}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setShowManual(false);
              setManualValue('');
              onChange('');
            }}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: 'var(--text-4)',
              lineHeight: 1,
              padding: '0 4px',
            }}
            title="Back to dropdown"
          >
            ×
          </button>
          {manualValue && (
            <div style={{
              fontSize: 11,
              color: 'var(--color-primary)',
              marginTop: 4,
              fontWeight: 600,
            }}>
              ✓ Custom value: "{manualValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManualTypeDropdown;
