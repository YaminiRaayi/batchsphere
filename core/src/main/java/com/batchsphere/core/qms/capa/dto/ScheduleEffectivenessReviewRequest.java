package com.batchsphere.core.qms.capa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ScheduleEffectivenessReviewRequest {

    @NotNull(message = "Effectiveness review date is required")
    private LocalDate effectivenessReviewDate;

    @NotBlank(message = "Effectiveness reviewer is required")
    private String effectivenessReviewer;
}
