package com.dentcare.security.controller;

import com.dentcare.security.dto.AuthErrorResponse;
import com.dentcare.security.dto.AuthUserResponse;
import com.dentcare.security.dto.CsrfTokenResponse;
import com.dentcare.security.dto.LoginRequest;
import com.dentcare.security.model.DentCareUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller exposing authentication, current-user, and CSRF token endpoints.
 * Session management is explicitly coordinated through SessionAuthenticationStrategy
 * and SecurityContextRepository.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(AuthenticationManager authenticationManager,
                          SessionAuthenticationStrategy sessionAuthenticationStrategy,
                          SecurityContextRepository securityContextRepository) {
        this.authenticationManager = authenticationManager;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.securityContextRepository = securityContextRepository;
    }

    /**
     * Authenticates a user with email and password, executes session fixation strategy,
     * persists the SecurityContext into HttpSession, and returns the authenticated user profile.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        String normalizedEmail = request.email() != null ? request.email().trim().toLowerCase() : "";

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.password())
            );

            sessionAuthenticationStrategy.onAuthentication(authentication, httpRequest, httpResponse);

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            securityContextRepository.saveContext(context, httpRequest, httpResponse);

            DentCareUserDetails userDetails = (DentCareUserDetails) authentication.getPrincipal();
            return ResponseEntity.ok(AuthUserResponse.fromUserDetails(userDetails));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthErrorResponse.of(401, "Unauthorized", "Invalid email or password"));
        }
    }

    /**
     * Returns the currently authenticated user's profile from the session SecurityContext.
     */
    @GetMapping("/me")
    public ResponseEntity<AuthUserResponse> getCurrentUser(
            @AuthenticationPrincipal DentCareUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(AuthUserResponse.fromUserDetails(userDetails));
    }

    /**
     * Materializes the CSRF token from request attributes and returns safe metadata
     * for client-side inclusion in mutating HTTP headers.
     */
    @GetMapping("/csrf")
    public ResponseEntity<CsrfTokenResponse> getCsrfToken(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken == null) {
            csrfToken = (CsrfToken) request.getAttribute("_csrf");
        }
        if (csrfToken == null) {
            throw new IllegalStateException("CsrfToken not available in request attributes");
        }
        return ResponseEntity.ok(new CsrfTokenResponse(
                csrfToken.getToken(),
                csrfToken.getHeaderName(),
                csrfToken.getParameterName()
        ));
    }
}
