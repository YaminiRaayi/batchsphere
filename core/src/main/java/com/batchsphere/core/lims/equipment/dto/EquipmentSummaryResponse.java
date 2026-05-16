package com.batchsphere.core.lims.equipment.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EquipmentSummaryResponse {

    long totalActive;
    long pendingQualification;
    long underMaintenance;
    long calibrationDueSoon;
    long qualificationDueSoon;
    long calibrationOverdue;
    long qualificationOverdue;
}
