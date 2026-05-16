package com.batchsphere.core.lims.equipment.dto;

import com.batchsphere.core.lims.equipment.entity.EquipmentStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UpdateEquipmentRequest {

    private String name;

    private String location;

    private String manufacturer;

    private String model;

    private String serialNumber;

    private LocalDate installationDate;

    private Integer calibrationIntervalMonths;

    private String responsibleAnalyst;

    private EquipmentStatus status;
}
