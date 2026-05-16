package com.batchsphere.core.compliance.delegation.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

public class ApprovalDelegationDTO {
    @Getter
    @Setter
    public static class CreateApprovalDelegationRequest {
        @NotBlank
        private String delegatorUsername;
        @NotBlank
        private String delegateUsername;
        private String scopeEntityType;
        private String scopeAction;
        @NotNull
        private LocalDateTime validFrom;
        @NotNull
        @Future
        private LocalDateTime validUntil;
        @NotBlank
        private String reason;
    }

    @Value
    @Builder
    public static class ApprovalDelegationResponse {
        UUID id;
        String delegatorUsername;
        String delegateUsername;
        String scopeEntityType;
        String scopeAction;
        LocalDateTime validFrom;
        LocalDateTime validUntil;
        String reason;
        Boolean isActive;
        String createdBy;
        LocalDateTime createdAt;
        String revokedBy;
        LocalDateTime revokedAt;
    }
}
