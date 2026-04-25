package com.batchsphere.core.masterdata.warehouselocation.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateRoomRequest {

    @NotBlank
    private String roomCode;

    @NotBlank
    private String roomName;

    @NotNull
    private StorageCondition storageCondition;

    private String description;
    private BigDecimal maxCapacity;
    private String capacityUom;
    private String temperatureRange;
    private String humidityRange;

    @NotBlank
    private String updatedBy;
}
