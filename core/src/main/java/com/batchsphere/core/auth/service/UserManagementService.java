package com.batchsphere.core.auth.service;

import com.batchsphere.core.auth.dto.CreateUserRequest;
import com.batchsphere.core.auth.dto.UpdateUserRequest;
import com.batchsphere.core.auth.dto.UserManagementResponse;
import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserManagementResponse createUser(CreateUserRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Username already exists: " + username);
        }
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email already exists: " + email);
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .isActive(true)
                .employeeId(request.getEmployeeId())
                .createdAt(LocalDateTime.now())
                .build();

        return toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public List<UserManagementResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .sorted((left, right) -> left.getUsername().compareToIgnoreCase(right.getUsername()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserManagementResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = getUser(id);
        String email = request.getEmail().trim().toLowerCase();

        if (!user.getEmail().equalsIgnoreCase(email) && userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email already exists: " + email);
        }

        user.setEmail(email);
        user.setRole(request.getRole());
        user.setIsActive(request.getIsActive());
        user.setEmployeeId(request.getEmployeeId());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        user.setUpdatedAt(LocalDateTime.now());

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void deactivateUser(UUID id) {
        User user = getUser(id);
        user.setIsActive(false);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    private User getUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    private UserManagementResponse toResponse(User user) {
        return UserManagementResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .employeeId(user.getEmployeeId())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
