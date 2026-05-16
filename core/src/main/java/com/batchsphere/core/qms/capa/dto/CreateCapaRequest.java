package com.batchsphere.core.qms.capa.dto;

import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class CreateCapaRequest {

    @NotNull
    private UUID deviationId;

    @NotBlank
    private String title;

    private String description;

    @NotNull
    private DeviationSeverity severity;

    @NotBlank
    private String owner;

    @NotNull
    @FutureOrPresent
    private LocalDate dueDate;

    @NotBlank
    @Size(min = 30, message = "Corrective action must be at least 30 characters (ALCOA+ requirement)")
    private String correctiveAction;

    private String preventiveAction;

    private String effectivenessCheck;
}
