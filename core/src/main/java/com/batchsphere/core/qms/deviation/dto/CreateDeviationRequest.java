package com.batchsphere.core.qms.deviation.dto;

import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
import com.batchsphere.core.qms.deviation.entity.DeviationSourceModule;
import com.batchsphere.core.qms.deviation.entity.DeviationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class CreateDeviationRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String description;

    @NotNull
    private DeviationType deviationType;

    @NotNull
    private DeviationSeverity severity;

    @NotNull
    private DeviationSourceModule sourceModule;

    private UUID sourceEntityId;

    private String sourceReference;

    private String department;

    private LocalDateTime detectedAt;

    private String immediateAction;
}
