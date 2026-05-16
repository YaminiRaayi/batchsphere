package com.batchsphere.core.qms.complaint.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class LinkDeviationRequest {

    @NotNull
    private UUID deviationId;
}
