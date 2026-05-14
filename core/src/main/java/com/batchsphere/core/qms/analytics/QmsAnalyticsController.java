package com.batchsphere.core.qms.analytics;

import com.batchsphere.core.qms.analytics.dto.QmsAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/qms/analytics")
@RequiredArgsConstructor
public class QmsAnalyticsController {

    private final QmsAnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<QmsAnalyticsResponse> getAnalytics() {
        return ResponseEntity.ok(analyticsService.getAnalytics());
    }
}
