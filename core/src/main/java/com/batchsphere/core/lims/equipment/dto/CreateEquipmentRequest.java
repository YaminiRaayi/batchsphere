package com.batchsphere.core.lims.equipment.dto;

import com.batchsphere.core.lims.equipment.entity.EquipmentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CreateEquipmentRequest {

    @NotBlank
    private String name;

    @NotNull
    private EquipmentType equipmentType;

    @NotBlank
    private String location;

    private String manufacturer;

    private String model;

    private String serialNumber;

    private LocalDate installationDate;

    private Integer calibrationIntervalMonths;

    private String responsibleAnalyst;
}
