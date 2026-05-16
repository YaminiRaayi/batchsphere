package com.batchsphere.core.auth.controller;

import com.batchsphere.core.auth.dto.AuthUserResponse;
import com.batchsphere.core.auth.dto.ChangePasswordRequest;
import com.batchsphere.core.auth.dto.LoginRequest;
import com.batchsphere.core.auth.dto.LoginResponse;
import com.batchsphere.core.auth.dto.RefreshTokenRequest;
import com.batchsphere.core.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, httpRequest));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
        authService.logout(httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/session-timeout")
    public ResponseEntity<Void> sessionTimeout(HttpServletRequest httpRequest) {
        authService.sessionTimeout(httpRequest);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthUserResponse> me() {
        return ResponseEntity.ok(authService.currentUser());
    }

    @PostMapping("/change-password")
    public ResponseEntity<AuthUserResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(authService.changePassword(request));
    }
}
