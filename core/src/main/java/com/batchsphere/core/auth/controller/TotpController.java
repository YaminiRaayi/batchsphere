package com.batchsphere.core.auth.controller;

import com.batchsphere.core.auth.dto.LoginResponse;
import com.batchsphere.core.auth.dto.TotpSetupResponse;
import com.batchsphere.core.auth.dto.TotpVerifyRequest;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.auth.service.TotpService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/totp")
@RequiredArgsConstructor
public class TotpController {

    private final TotpService totpService;

    @PostMapping("/setup")
    public ResponseEntity<TotpSetupResponse> setup(Authentication authentication) {
        return ResponseEntity.ok(totpService.setup((AuthenticatedUser) authentication.getPrincipal()));
    }

    @PostMapping("/verify")
    public ResponseEntity<LoginResponse> verify(@Valid @RequestBody TotpVerifyRequest request,
                                                Authentication authentication,
                                                HttpServletRequest httpRequest) {
        AuthenticatedUser user = authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser principal
                ? principal
                : null;
        return ResponseEntity.ok(totpService.verify(request, user, httpRequest));
    }
}
