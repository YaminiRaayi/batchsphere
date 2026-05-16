package com.batchsphere.core.auth.service;

import com.batchsphere.core.auth.dto.AuthUserResponse;
import com.batchsphere.core.auth.dto.ChangePasswordRequest;
import com.batchsphere.core.auth.dto.LoginRequest;
import com.batchsphere.core.auth.dto.LoginResponse;
import com.batchsphere.core.auth.dto.RefreshTokenRequest;
import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.auth.security.CustomUserDetailsService;
import com.batchsphere.core.auth.security.JwtService;
import com.batchsphere.core.compliance.security.entity.SecurityAuditEventType;
import com.batchsphere.core.compliance.security.service.SecurityAuditEventService;
import com.batchsphere.core.exception.BusinessConflictException;
import jakarta.servlet.http.HttpServletRequest;
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
    private final SecurityAuditEventService securityAuditEventService;
    private final TotpService totpService;
    private final PasswordPolicyService passwordPolicyService;

    @Transactional(noRollbackFor = BusinessConflictException.class)
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String username = request.getUsername().trim();
        String ip = extractIp(httpRequest);
        String ua = extractUserAgent(httpRequest);

        User account = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    securityAuditEventService.record(SecurityAuditEventType.LOGIN_FAILED, username, ip, ua, "User not found");
                    return new BusinessConflictException("Invalid username or password");
                });

        if (!Boolean.TRUE.equals(account.getIsActive())) {
            securityAuditEventService.record(SecurityAuditEventType.LOGIN_FAILED, username, ip, ua, "Account inactive");
            throw new BusinessConflictException("User account is inactive. Contact an administrator.");
        }
        if (account.getLockedUntil() != null && account.getLockedUntil().isAfter(LocalDateTime.now())) {
            securityAuditEventService.record(SecurityAuditEventType.LOGIN_FAILED, username, ip, ua, "Account locked");
            throw new BusinessConflictException("User account is locked until " + account.getLockedUntil() + ". Contact an administrator.");
        }

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            boolean locked = recordFailedLogin(account);
            securityAuditEventService.record(SecurityAuditEventType.LOGIN_FAILED, username, ip, ua, "Invalid password");
            if (locked) {
                securityAuditEventService.record(SecurityAuditEventType.ACCOUNT_LOCKED, username, ip, ua,
                        "Account locked after " + MAX_FAILED_LOGIN_ATTEMPTS + " failed attempts");
            }
            throw new BusinessConflictException("Invalid username or password");
        }

        account.setFailedLoginAttempts(0);
        account.setLockedUntil(null);
        account.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(account);
        if (Boolean.TRUE.equals(saved.getTotpEnabled()) && saved.getTotpSecret() != null) {
            securityAuditEventService.record(SecurityAuditEventType.MFA_CHALLENGE, username, ip, ua, "Password verified; TOTP required");
            return LoginResponse.builder()
                    .accessToken(null)
                    .refreshToken(null)
                    .tokenType("Bearer")
                    .expiresInSeconds(0)
                    .refreshExpiresInSeconds(0)
                    .user(toResponse(new AuthenticatedUser(saved)))
                    .mfaRequired(true)
                    .mfaChallengeToken(totpService.buildChallengeToken(saved))
                    .build();
        }
        securityAuditEventService.record(SecurityAuditEventType.LOGIN, username, ip, ua, null);
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

    public void logout(HttpServletRequest httpRequest) {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            throw new BusinessConflictException("No authenticated user in security context");
        }
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof AuthenticatedUser authenticatedUser)) {
            throw new BusinessConflictException("No authenticated user in security context");
        }
        securityAuditEventService.record(SecurityAuditEventType.LOGOUT, authenticatedUser.getUsername(),
                extractIp(httpRequest), extractUserAgent(httpRequest), null);
    }

    public void sessionTimeout(HttpServletRequest httpRequest) {
        Object principal = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getPrincipal()
                : null;
        String username = (principal instanceof AuthenticatedUser u) ? u.getUsername() : "unknown";
        securityAuditEventService.record(SecurityAuditEventType.SESSION_TIMEOUT, username,
                extractIp(httpRequest), extractUserAgent(httpRequest), "30-minute idle timeout (21 CFR Part 11 §11.10)");
    }

    public AuthUserResponse currentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof AuthenticatedUser user)) {
            throw new BusinessConflictException("No authenticated user in security context");
        }
        return toResponse(user);
    }

    @Transactional
    public AuthUserResponse changePassword(ChangePasswordRequest request) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof AuthenticatedUser authenticatedUser)) {
            throw new BusinessConflictException("No authenticated user in security context");
        }
        User account = userRepository.findByUsername(authenticatedUser.getUsername())
                .orElseThrow(() -> new BusinessConflictException("Authenticated user account not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), account.getPasswordHash())) {
            throw new BusinessConflictException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), account.getPasswordHash())) {
            throw new BusinessConflictException("New password must be different from current password");
        }
        passwordPolicyService.validate(request.getNewPassword(), account.getUsername(), account.getEmail());
        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        account.setPasswordChangedAt(LocalDateTime.now());
        account.setForcePasswordChange(false);
        account.setFailedLoginAttempts(0);
        account.setLockedUntil(null);
        account.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(account);
        securityAuditEventService.record(SecurityAuditEventType.PASSWORD_CHANGED, saved.getUsername(), null, null, "User changed password");
        return AuthUserMapper.toResponse(new AuthenticatedUser(saved));
    }

    private AuthUserResponse toResponse(AuthenticatedUser user) {
        return AuthUserMapper.toResponse(user);
    }

    private LoginResponse buildLoginResponse(AuthenticatedUser user) {
        return LoginResponse.builder()
                .accessToken(jwtService.generateAccessToken(user))
                .refreshToken(jwtService.generateRefreshToken(user))
                .tokenType("Bearer")
                .expiresInSeconds(jwtService.getExpirationSeconds())
                .refreshExpiresInSeconds(jwtService.getRefreshExpirationSeconds())
                .user(toResponse(user))
                .mfaRequired(false)
                .mfaChallengeToken(null)
                .build();
    }

    private boolean recordFailedLogin(User account) {
        int attempts = account.getFailedLoginAttempts() == null ? 0 : account.getFailedLoginAttempts();
        attempts += 1;
        account.setFailedLoginAttempts(attempts);
        boolean justLocked = false;
        if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
            account.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
            justLocked = true;
        }
        account.setUpdatedAt(LocalDateTime.now());
        userRepository.save(account);
        return justLocked;
    }

    private String extractIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String extractUserAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
