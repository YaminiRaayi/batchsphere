package com.batchsphere.core.qms.capa.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.util.UUID;

@Value
@Builder
public class CapaAlertResponse {
    UUID capaId;
    String capaNumber;
    String title;
    String owner;
    String alertType;
    String severity;
    LocalDate dueDate;
    Long daysUntilDue;
    String message;
}
