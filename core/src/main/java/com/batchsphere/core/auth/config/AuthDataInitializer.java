package com.batchsphere.core.auth.config;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.UUID;

@Configuration
@RequiredArgsConstructor
@EnableConfigurationProperties(AuthSeedProperties.class)
public class AuthDataInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthSeedProperties authSeedProperties;

    @Bean
    public ApplicationRunner seedDefaultAdmin(
            @Value("${app.auth.bootstrap-admin.username}") String username,
            @Value("${app.auth.bootstrap-admin.email}") String email,
            @Value("${app.auth.bootstrap-admin.password}") String password,
            @Value("${app.auth.bootstrap-admin.role:SUPER_ADMIN}") String role
    ) {
        return args -> {
            if (!userRepository.existsByUsername(username)) {
                userRepository.save(User.builder()
                        .id(UUID.randomUUID())
                        .username(username.trim())
                        .email(email.trim())
                        .passwordHash(passwordEncoder.encode(password))
                        .role(UserRole.valueOf(role.trim()))
                        .isActive(true)
                        .createdAt(LocalDateTime.now())
                        .build());
            }

            for (AuthSeedProperties.SeedUser seedUser : authSeedProperties.getSeedUsers()) {
                seedUserIfMissing(seedUser);
            }
        };
    }

    private void seedUserIfMissing(AuthSeedProperties.SeedUser seedUser) {
        String username = seedUser.getUsername().trim();
        if (userRepository.existsByUsername(username)) {
            return;
        }

        userRepository.save(User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email(seedUser.getEmail().trim())
                .passwordHash(passwordEncoder.encode(seedUser.getPassword()))
                .role(UserRole.valueOf(seedUser.getRole().trim()))
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
    }
}
