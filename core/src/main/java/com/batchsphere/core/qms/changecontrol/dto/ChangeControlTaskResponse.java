package com.batchsphere.core.qms.changecontrol.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class ChangeControlTaskResponse {
    UUID id;
    String title;
    String description;
    String assignedTo;
    LocalDate dueDate;
    String status;
    LocalDateTime completedAt;
    String completedBy;
    LocalDateTime createdAt;
}
