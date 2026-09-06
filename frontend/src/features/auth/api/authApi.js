/**
 * API client for Patient Authentication and Self-Registration.
 * Communicates with backend /api/auth endpoints.
 */

export class AuthApiError extends Error {
  constructor(status, message, fieldErrors = {}, error = null) {
    super(message || `Authentication error (${status})`);
    this.name = 'AuthApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
  }
}

/**
 * Submits a new patient self-registration request.
 *
 * @param {Object} registrationData
 * @param {string} registrationData.firstName
 * @param {string} registrationData.lastName
 * @param {string} registrationData.email
 * @param {string} [registrationData.phone]
 * @param {string} registrationData.password
 * @returns {Promise<Object>} Created patient account response DTO
 */
export async function registerPatient(registrationData) {
  const payload = {
    firstName: registrationData.firstName?.trim() || '',
    lastName: registrationData.lastName?.trim() || '',
    email: registrationData.email?.trim() || '',
    password: registrationData.password || ''
  };

  if (registrationData.phone !== undefined && registrationData.phone !== null && registrationData.phone.trim() !== '') {
    payload.phone = registrationData.phone.trim();
  }

  let response;
  try {
    response = await fetch('/api/auth/register/patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    throw new AuthApiError(
      0,
      err.message || 'Unable to communicate with the authentication service. Please check your network connection.',
      {},
      'NetworkError'
    );
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const status = response.status;
    const message = data?.message || `Registration failed with status ${status}`;
    const fieldErrors = data?.fieldErrors || {};
    const errorType = data?.error || 'RegistrationError';
    throw new AuthApiError(status, message, fieldErrors, errorType);
  }

  return data;
}
