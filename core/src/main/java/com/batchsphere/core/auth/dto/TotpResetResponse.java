package com.batchsphere.core.auth.dto;

import lombok.Builder;

import java.util.UUID;

@Builder
public record TotpResetResponse(
        UUID userId,
        String username,
        Boolean totpEnabled
) {
}
