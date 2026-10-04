import { describe, expect, it } from 'vitest';
import { validatePatientForm } from '../patientValidation';

const valid = { patientCode: 'PAT-001', firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01', gender: 'OTHER', phone: '123', email: '' };

describe('patient form validation', () => {
  it('accepts a valid clinical record', () => {
    expect(validatePatientForm(valid, true)).toEqual({});
  });

  it('checks required fields, future birth dates, email, and optional field lengths', () => {
    const invalid = { ...valid, patientCode: ' ', firstName: '', phone: ' ', dateOfBirth: '2999-01-01', email: 'bad', city: 'x'.repeat(101) };
    const errors = validatePatientForm(invalid, true);
    expect(errors).toHaveProperty('patientCode');
    expect(errors).toHaveProperty('firstName');
    expect(errors).toHaveProperty('phone');
    expect(errors).toHaveProperty('dateOfBirth');
    expect(errors).toHaveProperty('email');
    expect(errors).toHaveProperty('city');
  });
});
