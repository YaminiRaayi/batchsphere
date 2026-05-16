package com.batchsphere.core.auth.dto;

import lombok.Builder;

@Builder
public record TotpSetupResponse(
        String secret,
        String otpauthUrl,
        String qrCodeDataUrl
) {
}
