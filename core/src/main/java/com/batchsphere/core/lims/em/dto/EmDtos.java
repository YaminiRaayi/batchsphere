package com.batchsphere.core.lims.em.dto;

import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class EmDtos {
    private EmDtos() {
    }

    @Data
    public static class CreateMonitoringPointRequest {
        private String pointCode;
        private String pointName;
        private String monitoringType;
        private UUID roomId;
        private String locationDescription;
        private String unit;
        private BigDecimal alertLimit;
        private BigDecimal actionLimit;
        private String createdBy;
    }

    @Data
    public static class RecordEmResultRequest {
        private UUID pointId;
        private BigDecimal resultValue;
        private LocalDateTime recordedAt;
        private String recordedBy;
        private String notes;
    }

    @Data
    public static class LinkBreachDeviationRequest {
        private UUID deviationId;
        private String updatedBy;
    }

    @Data
    @EqualsAndHashCode(callSuper = true)
    public static class DismissBreachRequest extends ESignatureRequest {
        private String reason;
        private String dismissedBy;
    }

    @Value
    @Builder
    public static class MonitoringPointResponse {
        UUID id;
        String pointCode;
        String pointName;
        String monitoringType;
        UUID roomId;
        String roomName;
        String locationDescription;
        String unit;
        BigDecimal alertLimit;
        BigDecimal actionLimit;
        EmResultResponse lastResult;
        Boolean isActive;
    }

    @Value
    @Builder
    public static class EmResultResponse {
        UUID id;
        UUID pointId;
        String pointCode;
        String pointName;
        String monitoringType;
        BigDecimal resultValue;
        String unit;
        LocalDateTime recordedAt;
        String recordedBy;
        Boolean alertBreached;
        Boolean actionBreached;
        Boolean suggestDeviation;
        UUID linkedDeviationId;
        Boolean breachDismissed;
        String notes;
        BigDecimal alertLimit;
        BigDecimal actionLimit;
    }
}
