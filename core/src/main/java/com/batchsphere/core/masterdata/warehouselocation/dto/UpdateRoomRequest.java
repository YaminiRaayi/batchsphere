package com.batchsphere.core.masterdata.warehouselocation.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateRoomRequest {

    @NotBlank
    private String roomCode;

    @NotBlank
    private String roomName;

    @NotNull
    private StorageCondition storageCondition;

    private String description;

    @NotBlank
    private String updatedBy;
}
