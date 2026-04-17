package com.batchsphere.core.auth.service;

import com.batchsphere.core.auth.dto.AuthUserResponse;
import com.batchsphere.core.auth.dto.LoginRequest;
import com.batchsphere.core.auth.dto.LoginResponse;
import com.batchsphere.core.auth.dto.RefreshTokenRequest;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.auth.security.CustomUserDetailsService;
import com.batchsphere.core.auth.security.JwtService;
import com.batchsphere.core.exception.BusinessConflictException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final CustomUserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponse login(LoginRequest request) {
        AuthenticatedUser user = (AuthenticatedUser) userDetailsService.loadUserByUsername(request.getUsername());
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessConflictException("Invalid username or password");
        }

        return buildLoginResponse(user);
    }

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
}
