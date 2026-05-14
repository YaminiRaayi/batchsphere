package com.batchsphere.core.qms.capa.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CapaRejectRequest {

    @NotBlank(message = "Rejection reason is required")
    private String reason;
}
