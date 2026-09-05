package com.dentcare.security.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Baseline Spring Security configuration for DentCare.
 * Provides the BCrypt PasswordEncoder bean and configures a temporary permit-all
 * security filter chain so existing module endpoints (such as MF-06 Inventory)
 * remain fully accessible until authentication endpoints and role-based guards are introduced.
 */
@AutoConfiguration(before = SecurityAutoConfiguration.class)
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Temporarily disable CSRF for PR-A foundation to keep existing REST/MockMvc tests green
            // until session-based authentication and CSRF token handling are implemented.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                // Temporary permit-all baseline for PR-A: preserves unrestricted access to existing APIs
                .anyRequest().permitAll()
            );
        return http.build();
    }
}
