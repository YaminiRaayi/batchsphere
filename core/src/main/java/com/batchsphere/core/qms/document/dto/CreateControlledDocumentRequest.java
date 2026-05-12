package com.batchsphere.core.qms.document.dto;

import com.batchsphere.core.qms.document.entity.ControlledDocumentType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateControlledDocumentRequest {
    @NotBlank
    private String documentNumber;

    @NotBlank
    private String title;

    @NotNull
    private ControlledDocumentType documentType;

    private String category;

    @NotBlank
    private String department;

    private String linkedMaterialCode;

    private String linkedMoaCode;

    @Min(1)
    private Integer reviewCycleMonths = 24;

    @NotBlank
    private String changeSummary;
}
