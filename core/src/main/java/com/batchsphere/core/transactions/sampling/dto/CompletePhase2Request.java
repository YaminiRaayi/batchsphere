package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CompletePhase2Request {
    @NotBlank
    private String phaseTwoSummary;
    private String rootCause;
    private String resolutionRemarks;
    private Boolean capaRequired;
    private String capaReference;
    @NotBlank
    private String confirmedBy;
    @NotBlank
    private String confirmationText;
    private String eSignatureUsername;
    private String eSignaturePassword;
    private String eSignatureMeaning;
}
