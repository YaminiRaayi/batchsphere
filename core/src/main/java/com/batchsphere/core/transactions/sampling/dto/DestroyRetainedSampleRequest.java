package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DestroyRetainedSampleRequest {

    @NotBlank
    private String remarks;
}
