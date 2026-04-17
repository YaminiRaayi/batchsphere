package com.batchsphere.core.auth.config;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.UUID;

@Configuration
@RequiredArgsConstructor
public class AuthDataInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public ApplicationRunner seedDefaultAdmin(
            @Value("${app.auth.bootstrap-admin.username}") String username,
            @Value("${app.auth.bootstrap-admin.email}") String email,
            @Value("${app.auth.bootstrap-admin.password}") String password,
            @Value("${app.auth.bootstrap-admin.role:SUPER_ADMIN}") String role
    ) {
        return args -> {
            if (userRepository.existsByUsername(username)) {
                return;
            }

            userRepository.save(User.builder()
                    .id(UUID.randomUUID())
                    .username(username.trim())
                    .email(email.trim())
                    .passwordHash(passwordEncoder.encode(password))
                    .role(UserRole.valueOf(role.trim()))
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .build());
        };
    }
}
