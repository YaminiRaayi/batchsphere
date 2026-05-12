package com.batchsphere.core.auth.config;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.hrms.employee.entity.Employee;
import com.batchsphere.core.hrms.employee.entity.EmployeeQualificationStatus;
import com.batchsphere.core.hrms.employee.entity.EmployeeStatus;
import com.batchsphere.core.hrms.employee.repository.EmployeeRepository;
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
    private final EmployeeRepository employeeRepository;
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
            User admin = userRepository.findByUsername(username).orElse(null);
            if (admin == null) {
                admin = userRepository.save(User.builder()
                        .id(UUID.randomUUID())
                        .username(username.trim())
                        .email(email.trim())
                        .passwordHash(passwordEncoder.encode(password))
                        .role(UserRole.valueOf(role.trim()))
                        .isActive(true)
                        .failedLoginAttempts(0)
                        .passwordChangedAt(LocalDateTime.now())
                        .forcePasswordChange(false)
                        .createdAt(LocalDateTime.now())
                        .build());
            }
            ensureEmployeeLinked(admin, "System Administrator", "Administration");

            for (AuthSeedProperties.SeedUser seedUser : authSeedProperties.getSeedUsers()) {
                User seeded = seedUserIfMissing(seedUser);
                ensureEmployeeLinked(seeded, jobTitleForRole(seeded.getRole()), departmentForRole(seeded.getRole()));
            }
        };
    }

    private User seedUserIfMissing(AuthSeedProperties.SeedUser seedUser) {
        String username = seedUser.getUsername().trim();
        User existing = userRepository.findByUsername(username).orElse(null);
        if (existing != null) {
            return existing;
        }

        return userRepository.save(User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email(seedUser.getEmail().trim())
                .passwordHash(passwordEncoder.encode(seedUser.getPassword()))
                .role(UserRole.valueOf(seedUser.getRole().trim()))
                .isActive(true)
                .failedLoginAttempts(0)
                .passwordChangedAt(LocalDateTime.now())
                .forcePasswordChange(false)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void ensureEmployeeLinked(User user, String jobTitle, String department) {
        if (user.getEmployeeId() != null && employeeRepository.findById(user.getEmployeeId()).isPresent()) {
            return;
        }

        String employeeCode = "EMP-" + user.getUsername().trim().toUpperCase().replaceAll("[^A-Z0-9]+", "-");
        Employee employee = employeeRepository.findByEmployeeCodeIgnoreCaseAndIsActiveTrue(employeeCode)
                .orElseGet(() -> employeeRepository.save(Employee.builder()
                        .id(UUID.randomUUID())
                        .employeeCode(employeeCode)
                        .fullName(displayName(user.getUsername()))
                        .email(user.getEmail())
                        .department(department)
                        .site("BatchSphere Main Site")
                        .jobTitle(jobTitle)
                        .employmentStatus(EmployeeStatus.ACTIVE)
                        .qualificationStatus(EmployeeQualificationStatus.QUALIFIED)
                        .isActive(true)
                        .createdBy("system")
                        .createdAt(LocalDateTime.now())
                        .build()));

        user.setEmployeeId(employee.getId());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    private String displayName(String username) {
        String[] parts = username.replace('.', ' ').replace('_', ' ').split(" ");
        StringBuilder builder = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            builder.append(part.substring(0, 1).toUpperCase()).append(part.substring(1));
        }
        return builder.isEmpty() ? username : builder.toString();
    }

    private String departmentForRole(UserRole role) {
        return switch (role) {
            case WAREHOUSE_OP -> "Warehouse";
            case QC_ANALYST, QC_MANAGER -> "Quality Control";
            case PROCUREMENT -> "Procurement";
            case SUPER_ADMIN -> "Administration";
            case VIEWER -> "General";
        };
    }

    private String jobTitleForRole(UserRole role) {
        return switch (role) {
            case WAREHOUSE_OP -> "Warehouse Operator";
            case QC_ANALYST -> "QC Analyst";
            case QC_MANAGER -> "QC Manager";
            case PROCUREMENT -> "Procurement Specialist";
            case SUPER_ADMIN -> "System Administrator";
            case VIEWER -> "Business Viewer";
        };
    }
}
