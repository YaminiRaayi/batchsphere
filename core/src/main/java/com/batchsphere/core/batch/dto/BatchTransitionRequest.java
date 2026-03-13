package com.batchsphere.core.batch.dto;

import com.batchsphere.core.batch.entity.BatchStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NonNull;

@Data
public class BatchTransitionRequest {

    @NonNull
    private BatchStatus targetStatus;

    @NotBlank
    private String updatedBy;

}
