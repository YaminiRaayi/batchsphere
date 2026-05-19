package com.batchsphere.core.lims.reagent.dto;

import lombok.Builder;
import lombok.Data;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class ReagentDtos {
    private ReagentDtos() {
    }

    @Data
    public static class CreateReagentRequest {
        private String reagentCode;
        private String reagentName;
        private String grade;
        private String manufacturer;
        private String storageCondition;
        private String createdBy;
    }

    @Data
    public static class CreateReagentLotRequest {
        private String lotNumber;
        private String supplier;
        private LocalDate receivedDate;
        private LocalDate expiryDate;
        private BigDecimal quantityReceived;
        private BigDecimal quantityUsed;
        private String unit;
        private String status;
        private String createdBy;
    }

    @Data
    public static class UpdateReagentLotRequest {
        private BigDecimal quantityUsed;
        private String status;
        private String updatedBy;
    }

    @Value
    @Builder
    public static class ReagentResponse {
        UUID id;
        String reagentCode;
        String reagentName;
        String grade;
        String manufacturer;
        String storageCondition;
        long activeLotCount;
        boolean hasExpiringLot;
        boolean hasExpiredLot;
        Boolean isActive;
        LocalDateTime createdAt;
    }

    @Value
    @Builder
    public static class ReagentLotResponse {
        UUID id;
        UUID reagentId;
        String reagentCode;
        String reagentName;
        String lotNumber;
        String supplier;
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
