package com.batchsphere.core.qms.complaint.dto;

import com.batchsphere.core.qms.complaint.entity.ComplaintCategory;
import com.batchsphere.core.qms.complaint.entity.ComplaintSeverity;
import com.batchsphere.core.qms.complaint.entity.ComplaintSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CreateComplaintRequest {

    @NotBlank
    private String description;

    @NotNull
    private LocalDate receivedDate;

    @NotNull
    private ComplaintSource source;

    @NotNull
    private ComplaintCategory category;

    @NotNull
    private ComplaintSeverity severity;

    private String productName;

    private String lotNumber;

    private String reportedBy;

    private String initialAssessment;
}
