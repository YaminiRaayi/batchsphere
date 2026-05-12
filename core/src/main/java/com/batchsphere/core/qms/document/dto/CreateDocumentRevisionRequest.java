package com.batchsphere.core.qms.document.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateDocumentRevisionRequest {
    @NotBlank
    private String revision;

    @NotBlank
    private String changeSummary;
}
