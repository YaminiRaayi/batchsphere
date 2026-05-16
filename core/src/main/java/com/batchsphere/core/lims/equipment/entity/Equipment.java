package com.batchsphere.core.lims.equipment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "equipment")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Equipment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "equipment_id", nullable = false, unique = true, length = 50)
    private String equipmentId;

    @Column(nullable = false, length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "equipment_type", nullable = false)
    private EquipmentType equipmentType;

    @Column(length = 255)
    private String manufacturer;

    @Column(length = 255)
    private String model;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(nullable = false, length = 255)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentStatus status;

    @Column(name = "installation_date")
    private LocalDate installationDate;

    @Column(name = "last_qualification_date")
    private LocalDate lastQualificationDate;

    @Column(name = "next_qualification_due")
    private LocalDate nextQualificationDue;

    @Column(name = "last_calibration_date")
    private LocalDate lastCalibrationDate;

    @Column(name = "next_calibration_due")
    private LocalDate nextCalibrationDue;

    @Column(name = "calibration_interval_months")
    private Integer calibrationIntervalMonths;

    @Column(name = "responsible_analyst", length = 100)
    private String responsibleAnalyst;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
