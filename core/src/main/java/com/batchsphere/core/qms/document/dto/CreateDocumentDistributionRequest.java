package com.batchsphere.core.qms.document.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CreateDocumentDistributionRequest {
    @NotEmpty
    private List<String> assignedUsernames;
    private LocalDate dueDate;
}
