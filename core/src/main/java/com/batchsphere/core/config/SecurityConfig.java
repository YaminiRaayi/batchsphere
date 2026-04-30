package com.batchsphere.core.config;

import com.batchsphere.core.auth.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/api/auth/refresh").permitAll()
                        .requestMatchers("/api/auth/me", "/api/auth/logout").authenticated()
                        .requestMatchers("/api/auth/users/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/grns/items/*/containers").hasAnyRole("SUPER_ADMIN", "WAREHOUSE_OP", "QC_ANALYST", "QC_MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/batches", "/api/batches/*").hasAnyRole("SUPER_ADMIN", "WAREHOUSE_OP", "QC_ANALYST", "QC_MANAGER")
                        .requestMatchers("/api/grns/**", "/api/inventory/**", "/api/batches/**").hasAnyRole("SUPER_ADMIN", "WAREHOUSE_OP")
                        .requestMatchers("/api/sampling-requests/*/investigations/*/qa-review", "/api/sampling-requests/*/qc-decision")
                        .hasAnyRole("SUPER_ADMIN", "QC_MANAGER")
                        .requestMatchers("/api/sampling-requests/**", "/api/specs/**", "/api/moas/**", "/api/sampling-tools/**")
                        .hasAnyRole("SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER")
                        .requestMatchers("/api/suppliers/**", "/api/vendors/**", "/api/vendor-business-units/**")
                        .hasAnyRole("SUPER_ADMIN", "PROCUREMENT")
                        .requestMatchers("/api/business-units/**")
                        .hasAnyRole("SUPER_ADMIN", "WAREHOUSE_OP", "QC_ANALYST", "QC_MANAGER")
                        .requestMatchers("/api/materials/**", "/api/warehouses/**", "/api/rooms/**", "/api/racks/**", "/api/shelves/**", "/api/pallets/**")
                        .hasAnyRole("SUPER_ADMIN", "WAREHOUSE_OP", "QC_ANALYST", "QC_MANAGER")
                        .requestMatchers("/api/**").hasRole("SUPER_ADMIN")
                        .anyRequest().permitAll()
                );
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
