package com.batchsphere.core.qms.analytics.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

@Value
@Builder
public class QmsAnalyticsResponse {

    Map<String, Long> deviationsByStatus;
    Map<String, Long> deviationsBySeverity;
    Map<String, Long> deviationsBySourceModule;
    List<MonthlyCount> deviationsByMonth;

    Map<String, Long> capasByStatus;
    long overdueCapas;
    long dueThisWeek;
    Long avgCapaClosureDays;
    AgingBuckets capaAging;

    long openChangeControls;
    long pendingCCApprovals;
    long overdueEffectivenessChecks;
    long documentsAwaitingReview;
    long overdueTrainingAssignments;

    @Value
    @Builder
    public static class MonthlyCount {
        String month;
        long count;
    }

    @Value
    @Builder
    public static class AgingBuckets {
        long days0to30;
        long days31to60;
        long days61to90;
        long daysOver90;
    }
}
