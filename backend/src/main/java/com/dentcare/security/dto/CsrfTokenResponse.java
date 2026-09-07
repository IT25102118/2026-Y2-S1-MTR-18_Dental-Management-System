package com.dentcare.security.dto;

/**
 * Public response DTO for CSRF token initialization.
 * Exposes token value and required HTTP header name for SPA requests.
 */
public record CsrfTokenResponse(
        String token,
        String headerName,
        String parameterName
) {
}
