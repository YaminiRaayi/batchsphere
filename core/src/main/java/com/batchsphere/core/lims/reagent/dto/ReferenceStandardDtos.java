package com.batchsphere.core.lims.reagent.dto;

import lombok.Builder;
import lombok.Data;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class ReferenceStandardDtos {
    private ReferenceStandardDtos() {
    }

    @Data
    public static class CreateReferenceStandardRequest {
        private String standardCode;
        private String standardName;
        private String pharmacopeia;
        private String storageCondition;
        private String createdBy;
    }

    @Data
    public static class CreateReferenceStandardLotRequest {
        private String lotNumber;
        private BigDecimal potency;
        private LocalDate receivedDate;
        private LocalDate expiryDate;
        private BigDecimal quantityReceived;
        private BigDecimal quantityUsed;
        private String unit;
        private String status;
        private String createdBy;
    }

    @Data
    public static class UpdateReferenceStandardLotRequest {
        private BigDecimal quantityUsed;
        private String status;
        private String updatedBy;
    }

    @Value
    @Builder
    public static class ReferenceStandardResponse {
        UUID id;
        String standardCode;
        String standardName;
        String pharmacopeia;
        String storageCondition;
        long activeLotCount;
        boolean hasExpiringLot;
        boolean hasExpiredLot;
        Boolean isActive;
        LocalDateTime createdAt;
    }

    @Value
    @Builder
    public static class ReferenceStandardLotResponse {
        UUID id;
        UUID standardId;
        String standardCode;
        String standardName;
        String lotNumber;
        BigDecimal potency;
        LocalDate receivedDate;
        LocalDate expiryDate;
        BigDecimal quantityReceived;
        BigDecimal quantityUsed;
        BigDecimal quantityRemaining;
        String unit;
        String storedStatus;
        String status;
        Boolean isActive;
    }
}
