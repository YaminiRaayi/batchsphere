package com.batchsphere.core.auth.service;

import com.batchsphere.core.auth.dto.AuthUserResponse;
import com.batchsphere.core.auth.dto.LoginRequest;
import com.batchsphere.core.auth.dto.LoginResponse;
import com.batchsphere.core.auth.dto.RefreshTokenRequest;
import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.auth.security.CustomUserDetailsService;
import com.batchsphere.core.auth.security.JwtService;
import com.batchsphere.core.exception.BusinessConflictException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional(noRollbackFor = BusinessConflictException.class)
    public LoginResponse login(LoginRequest request) {
        User account = userRepository.findByUsername(request.getUsername().trim())
                .orElseThrow(() -> new BusinessConflictException("Invalid username or password"));
        validateLoginAllowed(account);

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            recordFailedLogin(account);
            throw new BusinessConflictException("Invalid username or password");
        }

        account.setFailedLoginAttempts(0);
        account.setLockedUntil(null);
        account.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(account);
        AuthenticatedUser user = new AuthenticatedUser(saved);
        return buildLoginResponse(user);
    }

    @Transactional(readOnly = true)
    public LoginResponse refresh(RefreshTokenRequest request) {
        String username;
        try {
            username = jwtService.extractUsername(request.getRefreshToken());
        } catch (IllegalArgumentException ex) {
            throw new BusinessConflictException("Invalid refresh token");
        }

        AuthenticatedUser user = (AuthenticatedUser) userDetailsService.loadUserByUsername(username);
        if (!jwtService.isRefreshTokenValid(request.getRefreshToken(), user)) {
            throw new BusinessConflictException("Invalid refresh token");
        }

        return buildLoginResponse(user);
    }

    public void logout() {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            throw new BusinessConflictException("No authenticated user in security context");
        }
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof AuthenticatedUser)) {
            throw new BusinessConflictException("No authenticated user in security context");
        }
    }

    public AuthUserResponse currentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof AuthenticatedUser user)) {
            throw new BusinessConflictException("No authenticated user in security context");
        }
        return toResponse(user);
    }

    private AuthUserResponse toResponse(AuthenticatedUser user) {
        return AuthUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(com.batchsphere.core.auth.entity.UserRole.valueOf(user.getRole()))
                .employeeId(user.getEmployeeId())
                .forcePasswordChange(user.isForcePasswordChange())
                .build();
    }

    private LoginResponse buildLoginResponse(AuthenticatedUser user) {
        return LoginResponse.builder()
                .accessToken(jwtService.generateAccessToken(user))
                .refreshToken(jwtService.generateRefreshToken(user))
                .tokenType("Bearer")
                .expiresInSeconds(jwtService.getExpirationSeconds())
                .refreshExpiresInSeconds(jwtService.getRefreshExpirationSeconds())
                .user(toResponse(user))
                .build();
    }

    private void validateLoginAllowed(User account) {
        if (!Boolean.TRUE.equals(account.getIsActive())) {
            throw new BusinessConflictException("User account is inactive. Contact an administrator.");
        }
        if (account.getLockedUntil() != null && account.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new BusinessConflictException("User account is locked until " + account.getLockedUntil() + ". Contact an administrator.");
        }
    }

    private void recordFailedLogin(User account) {
        int attempts = account.getFailedLoginAttempts() == null ? 0 : account.getFailedLoginAttempts();
        attempts += 1;
        account.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
            account.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
        }
        account.setUpdatedAt(LocalDateTime.now());
        userRepository.save(account);
    }
}
