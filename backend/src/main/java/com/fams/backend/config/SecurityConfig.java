package com.fams.backend.config;

import com.fams.backend.security.jwt.JwtAuthenticationFilter;
import jakarta.servlet.DispatcherType;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins}")
        private String allowedOrigins;

        // Cấu hình security chính
        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                // Disable CSRF (dùng JWT)
                                .csrf(AbstractHttpConfigurer::disable)

                                // Enable CORS
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                                // Session management
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                                // Authorization rules
                                .authorizeHttpRequests(auth -> auth
                                                // Allow DispatcherTypes for forwards and errors (common for SockJS)
                                                .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR)
                                                .permitAll()

                                                // Public endpoints
                                                .requestMatchers(
                                                                "/auth/**", // auth (login/register)
                                                                "/api/auth/**", // auth with /api prefix
                                                                "/api/map/**", // map endpoints
                                                                "/api/v1/semesters/**", // semester endpoints
                                                                "/api/v1/class-sections/**", // class section endpoints
                                                                "/api-docs/**",
                                                                "/swagger-ui/**",
                                                                "/swagger-ui.html",
                                                                "/v3/api-docs/**",
                                                                "/actuator/health",
                                                                "/ws/**", // WebSocket endpoint
                                                                "/api/files/**",
                                                                "/api/courses/**")
                                                .permitAll()

                                                // All other endpoints require authentication
                                                .anyRequest().authenticated())

                                // Custom Exception handling
                                .exceptionHandling(exception -> exception
                                                .authenticationEntryPoint((request, response, authException) -> {
                                                        response.setStatus(
                                                                        jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                                                        response.setContentType("application/json");
                                                        response.getWriter().write(
                                                                        "{\"status\": 401, \"error\": \"Unauthorized\", \"message\": \""
                                                                                        + authException.getMessage()
                                                                                        + "\"}");
                                                }))

                                // Add JWT filter
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        // CORS configuration
        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                // Split comma-separated origins from properties
                List<String> origins = Arrays.asList(allowedOrigins.split(","));
                configuration.setAllowedOriginPatterns(origins);

                // Allow HTTP methods
                configuration.setAllowedMethods(List.of(
                                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

                // Allow all headers
                configuration.setAllowedHeaders(List.of("*"));

                // Allow cookies / credentials
                configuration.setAllowCredentials(true);

                // Max age preflight
                configuration.setMaxAge(3600L);

                // Exposed headers
                configuration.setExposedHeaders(List.of("Content-Disposition"));

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);

                return source;
        }
}
