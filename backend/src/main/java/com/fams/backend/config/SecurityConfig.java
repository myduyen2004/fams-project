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
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final CorsConfigurationSource corsConfigurationSource;

        // Cấu hình security chính
        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                // Disable CSRF (dùng JWT)
                                .csrf(AbstractHttpConfigurer::disable)

                                // Enable CORS
                                .cors(cors -> cors.configurationSource(corsConfigurationSource))

                                // Security Headers
                                .headers(headers -> headers
                                                // Chống Clickjacking: ngăn iframe embed trang web
                                                .frameOptions(frame -> frame.deny())
                                                // Chống MIME sniffing: buộc browser tôn trọng Content-Type
                                                .contentTypeOptions(contentType -> {})
                                                // XSS Protection header (legacy nhưng vẫn hữu ích cho IE)
                                                .xssProtection(xss -> xss.headerValue(
                                                                org.springframework.security.web.header.writers.XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                                                // HTTP Strict Transport Security: buộc dùng HTTPS
                                                .httpStrictTransportSecurity(hsts -> hsts
                                                                .includeSubDomains(true)
                                                                .maxAgeInSeconds(31536000))
                                                // Content-Security-Policy: hạn chế nguồn tải tài nguyên
                                                .contentSecurityPolicy(csp -> csp
                                                                .policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none'"))
                                                // Referrer Policy: hạn chế thông tin referrer gửi đi
                                                .referrerPolicy(referrer -> referrer
                                                                .policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                                                // Permissions Policy: tắt các API không cần thiết
                                                .permissionsPolicy(permissions -> permissions
                                                                .policy("camera=(), microphone=(), geolocation=(self), payment=()")))

                                // Session management
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                                // Authorization rules
                                .authorizeHttpRequests(auth -> auth
                                                // Allow DispatcherTypes for forwards and errors (common for SockJS)
                                                .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR)
                                                .permitAll()

                                                // Allow CORS preflight requests (OPTIONS) without authentication
                                                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**")
                                                .permitAll()

                                                // Public endpoints
                                                .requestMatchers(
                                                                "/auth/**", // auth (login/register)
                                                                "/api/auth/**", // auth with /api prefix
                                                                "/api/map/**", // map endpoints
                                                                "/api/v1/semesters/**", // semester endpoints
                                                                "/api/v1/class-sections/**", // class section endpoints
                                                                "/api/v1/files/**", // file download endpoints
                                                                "/api-docs/**",
                                                                "/swagger-ui/**",
                                                                "/swagger-ui.html",
                                                                "/v3/api-docs/**",
                                                                "/actuator/health",
                                                                "/ws/**", // WebSocket endpoint
                                                                "/ws-native/**", // Native WebSocket endpoint
                                                                "/api/files/**",
                                                                "/api/courses/**")
                                                .permitAll()

                                                // All other endpoints require authentication
                                                .anyRequest().authenticated())

                                // Custom Exception handling (sanitized error message to prevent info leakage)
                                .exceptionHandling(exception -> exception
                                                .authenticationEntryPoint((request, response, authException) -> {
                                                        response.setStatus(
                                                                        jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                                                        response.setContentType("application/json");
                                                        response.getWriter().write(
                                                                        "{\"status\": 401, \"error\": \"Unauthorized\", \"message\": \"Authentication required\"}");
                                                }))

                                // Add JWT filter
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        // CORS configuration defined in CorsConfig.java
}
