package com.batchsphere.core.lims.equipment.dto;

import com.batchsphere.core.lims.equipment.entity.QualificationResult;
import com.batchsphere.core.lims.equipment.entity.QualificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CreateQualificationRecordRequest {

    @NotNull
    private QualificationType qualificationType;

    @NotBlank
    private String protocolReference;

    @NotBlank
    private String performedBy;

    @NotNull
    private LocalDate performedAt;

    private String reviewedBy;

    private LocalDate reviewedAt;

    @NotNull
    private QualificationResult result;

    private String deviationNoted;

    private LocalDate nextRequalificationDue;

    private String calibrationCertificateNumber;

    private LocalDate calibrationCertificateExpiry;

    private String username;

    private String password;

    private String signatureMeaning;
}
