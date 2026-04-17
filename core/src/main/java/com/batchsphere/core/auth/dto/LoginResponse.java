package com.batchsphere.core.auth.dto;

import lombok.Builder;

@Builder
public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds,
        long refreshExpiresInSeconds,
        AuthUserResponse user
) {
}
