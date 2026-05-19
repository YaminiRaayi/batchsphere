package com.batchsphere.core.compliance.alcoa.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AlcoaReadinessGap {
    private String category;
    private String severity;
    private String title;
    private String status;
    private String entityType;
    private UUID recordId;
    private String recordCode;
    private String owner;
    private LocalDate dueDate;
    private LocalDateTime observedAt;
    private String route;
}
