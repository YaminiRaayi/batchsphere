package com.batchsphere.core.lims.stability.dto;

import lombok.Builder;
import lombok.Data;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class StabilityDtos {
    private StabilityDtos() {
    }

    @Data
    public static class CreateStabilityStudyRequest {
        private String studyNumber;
        private UUID materialId;
        private String productName;
        private String batchNumber;
        private String conditionLabel;
        private String storageCondition;
        private LocalDate startDate;
        private BigDecimal ootThresholdPct;
        private List<Integer> protocolMonths;
        private String createdBy;
    }

    @Data
    public static class PullTimepointRequest {
        private String pulledBy;
        private LocalDate pulledDate;
    }

    @Data
    public static class RecordStabilityResultRequest {
        private UUID specParameterId;
        private String parameterName;
        private BigDecimal resultValue;
        private String resultText;
        private String unit;
        private String enteredBy;
    }

    @Data
    public static class UpdateStabilityStatusRequest {
        private String status;
        private String updatedBy;
        private String username;
        private String password;
        private String signatureMeaning;
        private String ootDisposition;
    }

    @Value
    @Builder
    public static class StabilityStudySummaryResponse {
        UUID id;
        String studyNumber;
        UUID materialId;
        String productName;
        String batchNumber;
        String conditionLabel;
        String storageCondition;
        LocalDate startDate;
        BigDecimal ootThresholdPct;
        String status;
        long completedTimepoints;
        long totalTimepoints;
        boolean hasOotAlert;
        LocalDateTime createdAt;
    }

    @Value
    @Builder
    public static class StabilityStudyDetailResponse {
        StabilityStudySummaryResponse study;
        List<StabilityTimepointResponse> timepoints;
        List<StabilityResultResponse> results;
    }

    @Value
    @Builder
    public static class StabilityTimepointResponse {
        UUID id;
        UUID studyId;
        Integer monthOffset;
        LocalDate scheduledDate;
        LocalDate pulledDate;
        String pulledBy;
        String status;
    }

    @Value
    @Builder
    public static class StabilityResultResponse {
        UUID id;
        UUID studyId;
        UUID timepointId;
        UUID specParameterId;
        String parameterName;
        BigDecimal resultValue;
        String resultText;
        String unit;
        Boolean ootFlag;
        String enteredBy;
        LocalDateTime enteredAt;
    }

    @Value
    @Builder
    public static class TrendSeries {
        UUID specParameterId;
        String parameterName;
        String unit;
        List<TrendPoint> points;
    }

    @Value
    @Builder
    public static class TrendPoint {
        Integer monthOffset;
        BigDecimal value;
        Boolean ootFlag;
    }
}
