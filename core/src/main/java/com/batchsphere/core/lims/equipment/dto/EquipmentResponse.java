package com.batchsphere.core.lims.equipment.dto;

import com.batchsphere.core.lims.equipment.entity.Equipment;
import com.batchsphere.core.lims.equipment.entity.EquipmentStatus;
import com.batchsphere.core.lims.equipment.entity.EquipmentType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Value
@Builder
public class EquipmentResponse {

    UUID id;
    String equipmentId;
    String name;
    EquipmentType equipmentType;
    String manufacturer;
    String model;
    String serialNumber;
    String location;
    EquipmentStatus status;
    LocalDate installationDate;
    LocalDate lastQualificationDate;
    LocalDate nextQualificationDue;
    LocalDate lastCalibrationDate;
    LocalDate nextCalibrationDue;
    Integer calibrationIntervalMonths;
    String responsibleAnalyst;
    boolean calibrationOverdue;
    boolean qualificationOverdue;
    Integer daysUntilCalibrationDue;
    Boolean isActive;
    String createdBy;
    OffsetDateTime createdAt;
    String updatedBy;
    OffsetDateTime updatedAt;

    public static EquipmentResponse toResponse(Equipment e) {
        LocalDate today = LocalDate.now();

        boolean calibrationOverdue = e.getNextCalibrationDue() != null
                && e.getNextCalibrationDue().isBefore(today)
                && e.getStatus() != EquipmentStatus.RETIRED;

        boolean qualificationOverdue = e.getNextQualificationDue() != null
                && e.getNextQualificationDue().isBefore(today)
                && e.getStatus() != EquipmentStatus.RETIRED;

        Integer daysUntilCalibrationDue = null;
        if (e.getNextCalibrationDue() != null) {
            daysUntilCalibrationDue = (int) ChronoUnit.DAYS.between(today, e.getNextCalibrationDue());
        }

        return EquipmentResponse.builder()
                .id(e.getId())
                .equipmentId(e.getEquipmentId())
                .name(e.getName())
                .equipmentType(e.getEquipmentType())
                .manufacturer(e.getManufacturer())
                .model(e.getModel())
                .serialNumber(e.getSerialNumber())
                .location(e.getLocation())
                .status(e.getStatus())
                .installationDate(e.getInstallationDate())
                .lastQualificationDate(e.getLastQualificationDate())
                .nextQualificationDue(e.getNextQualificationDue())
                .lastCalibrationDate(e.getLastCalibrationDate())
                .nextCalibrationDue(e.getNextCalibrationDue())
                .calibrationIntervalMonths(e.getCalibrationIntervalMonths())
                .responsibleAnalyst(e.getResponsibleAnalyst())
                .calibrationOverdue(calibrationOverdue)
                .qualificationOverdue(qualificationOverdue)
                .daysUntilCalibrationDue(daysUntilCalibrationDue)
                .isActive(e.getIsActive())
                .createdBy(e.getCreatedBy())
                .createdAt(e.getCreatedAt())
                .updatedBy(e.getUpdatedBy())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
