const maxLengths = {
  patientCode: 30,
  firstName: 60,
  lastName: 60,
  phone: 25,
  email: 150,
  addressLine1: 150,
  addressLine2: 150,
  city: 100,
  emergencyContactName: 120,
  emergencyContactPhone: 25,
  emergencyContactRelationship: 50
};

const labels = {
  patientCode: 'Patient code',
  firstName: 'First name',
  lastName: 'Last name',
  phone: 'Phone number',
  email: 'Email',
  addressLine1: 'Address line 1',
  addressLine2: 'Address line 2',
  city: 'City',
  emergencyContactName: 'Emergency contact name',
  emergencyContactPhone: 'Emergency contact phone',
  emergencyContactRelationship: 'Emergency contact relationship'
};

export function validatePatientForm(formData, creating = false) {
  const errors = {};
  for (const field of [...(creating ? ['patientCode'] : []), 'firstName', 'lastName', 'phone']) {
    if (!formData[field]?.trim()) errors[field] = `${labels[field]} is required`;
  }
  for (const [field, limit] of Object.entries(maxLengths)) {
    if (formData[field]?.length > limit) errors[field] = `${labels[field]} cannot exceed ${limit} characters`;
  }
  if (!formData.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (formData.dateOfBirth > today) errors.dateOfBirth = 'Date of birth cannot be in the future';
  }
  if (!formData.gender) errors.gender = 'Gender is required';
  if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = 'Email must be a valid email address';
  }
  return errors;
}
