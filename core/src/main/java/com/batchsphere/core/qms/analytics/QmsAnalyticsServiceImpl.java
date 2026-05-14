package com.batchsphere.core.qms.analytics;

import com.batchsphere.core.qms.analytics.dto.QmsAnalyticsResponse;
import com.batchsphere.core.qms.capa.entity.Capa;
import com.batchsphere.core.qms.capa.entity.CapaStatus;
import com.batchsphere.core.qms.capa.repository.CapaRepository;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class QmsAnalyticsServiceImpl implements QmsAnalyticsService {

    private final DeviationRepository deviationRepository;
    private final CapaRepository capaRepository;

    @Override
    public QmsAnalyticsResponse getAnalytics() {
        Set<CapaStatus> terminal = Set.of(CapaStatus.CLOSED, CapaStatus.CANCELLED);
        List<Capa> openCapas = capaRepository.findByIsActiveTrueAndStatusNotIn(terminal);
        LocalDate today = LocalDate.now();

        return QmsAnalyticsResponse.builder()
                .deviationsByStatus(toStringLongMap(deviationRepository.countActiveByStatus()))
                .deviationsBySeverity(toStringLongMap(deviationRepository.countActiveBySeverity()))
                .deviationsBySourceModule(toStringLongMap(deviationRepository.countActiveBySourceModule()))
                .deviationsByMonth(buildMonthlyTrend())
                .capasByStatus(toStringLongMap(capaRepository.countActiveByStatus()))
                .overdueCapas(openCapas.stream().filter(c -> c.getDueDate().isBefore(today)).count())
                .dueThisWeek(openCapas.stream().filter(c -> !c.getDueDate().isBefore(today) && c.getDueDate().isBefore(today.plusDays(8))).count())
                .avgCapaClosureDays(calcAvgClosureDays())
                .capaAging(buildAgingBuckets(openCapas, today))
                .build();
    }

    private Map<String, Long> toStringLongMap(List<Object[]> rows) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (Object[] row : rows) {
            map.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        return map;
    }

    private List<QmsAnalyticsResponse.MonthlyCount> buildMonthlyTrend() {
        LocalDateTime since = LocalDateTime.now().minusMonths(5).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        List<Object[]> rows = deviationRepository.countByMonthSince(since);

        Map<String, Long> byMonth = new LinkedHashMap<>();
        YearMonth cursor = YearMonth.from(since.toLocalDate());
        YearMonth now = YearMonth.now();
        while (!cursor.isAfter(now)) {
            byMonth.put(cursor.toString(), 0L);
            cursor = cursor.plusMonths(1);
        }
        for (Object[] row : rows) {
            String month = (String) row[0];
            if (byMonth.containsKey(month)) {
                byMonth.put(month, ((Number) row[1]).longValue());
            }
        }

        List<QmsAnalyticsResponse.MonthlyCount> result = new ArrayList<>();
        byMonth.forEach((m, c) -> result.add(QmsAnalyticsResponse.MonthlyCount.builder().month(m).count(c).build()));
        return result;
    }

    private Long calcAvgClosureDays() {
        List<Capa> closed = capaRepository.findByIsActiveTrueAndStatus(CapaStatus.CLOSED);
        if (closed.isEmpty()) return null;
        long totalDays = 0;
        int counted = 0;
        for (Capa c : closed) {
            if (c.getClosedAt() != null) {
                totalDays += ChronoUnit.DAYS.between(c.getCreatedAt(), c.getClosedAt());
                counted++;
            }
        }
        return counted == 0 ? null : totalDays / counted;
    }

    private QmsAnalyticsResponse.AgingBuckets buildAgingBuckets(List<Capa> open, LocalDate today) {
        long b0 = 0, b1 = 0, b2 = 0, b3 = 0;
        for (Capa c : open) {
            long days = ChronoUnit.DAYS.between(c.getCreatedAt().toLocalDate(), today);
            if (days <= 30) b0++;
            else if (days <= 60) b1++;
            else if (days <= 90) b2++;
            else b3++;
        }
        return QmsAnalyticsResponse.AgingBuckets.builder()
                .days0to30(b0).days31to60(b1).days61to90(b2).daysOver90(b3)
                .build();
    }
}
