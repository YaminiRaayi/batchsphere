package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AmendQcTestResultRequest {

    private BigDecimal resultValue;
    private String resultText;
    private String remarks;

    @NotBlank(message = "Amendment justification is required")
    @Size(min = 20, message = "Amendment justification must be at least 20 characters")
    private String justification;

    @NotBlank(message = "E-signature username is required")
    private String eSignatureUsername;

    @NotBlank(message = "E-signature password is required")
    private String eSignaturePassword;
}
