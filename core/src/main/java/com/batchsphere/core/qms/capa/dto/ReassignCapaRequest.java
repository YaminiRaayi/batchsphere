package com.batchsphere.core.qms.capa.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReassignCapaRequest {
    @NotBlank
    private String newOwner;
    @NotBlank
    private String reason;
}
