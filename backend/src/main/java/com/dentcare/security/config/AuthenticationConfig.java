package com.dentcare.security.config;

import com.dentcare.security.service.DentCareUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Dedicated configuration for AuthenticationManager and DaoAuthenticationProvider.
 * Separated from SecurityConfig so that controller slices (@WebMvcTest) are not burdened
 * with UserDetailsService dependencies when testing other domain controllers.
 */
@Configuration
public class AuthenticationConfig {

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
            DentCareUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(passwordEncoder);
        provider.setUserDetailsService(userDetailsService);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}
