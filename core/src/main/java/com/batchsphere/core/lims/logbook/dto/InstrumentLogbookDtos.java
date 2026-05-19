package com.batchsphere.core.lims.logbook.dto;

import lombok.Builder;
import lombok.Data;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

public class InstrumentLogbookDtos {
    private InstrumentLogbookDtos() {
    }

    @Data
    public static class CreateInstrumentUsageLogRequest {
        private UUID equipmentId;
        private String usedBy;
        private LocalDateTime usedAt;
        private String purpose;
        private UUID samplingRequestId;
        private String condition;
        private String anomalyDescription;
        private UUID linkedDeviationId;
    }

    @Value
    @Builder
    public static class InstrumentUsageLogResponse {
        UUID id;
        UUID equipmentId;
        String equipmentCode;
        String equipmentName;
        String usedBy;
        LocalDateTime usedAt;
        String purpose;
        UUID samplingRequestId;
        String condition;
        String anomalyDescription;
        UUID linkedDeviationId;
        String linkedDeviationNumber;
        LocalDateTime createdAt;
        String createdBy;
        LocalDateTime updatedAt;
        String updatedBy;
        Boolean active;
    }
}
