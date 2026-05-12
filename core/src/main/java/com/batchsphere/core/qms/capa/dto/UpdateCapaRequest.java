package com.batchsphere.core.qms.capa.dto;

import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UpdateCapaRequest {

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
    private String correctiveAction;

    private String preventiveAction;

    private String effectivenessCheck;
}
