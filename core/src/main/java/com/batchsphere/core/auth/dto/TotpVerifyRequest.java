package com.batchsphere.core.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class TotpVerifyRequest {

    @NotBlank
    @Pattern(regexp = "\\d{6}", message = "TOTP code must be 6 digits")
    private String code;

    private String challengeToken;
}
