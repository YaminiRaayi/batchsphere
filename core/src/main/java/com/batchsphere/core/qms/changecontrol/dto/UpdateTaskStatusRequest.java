package com.batchsphere.core.qms.changecontrol.dto;

import com.batchsphere.core.qms.changecontrol.entity.ChangeControlTaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateTaskStatusRequest {
    @NotNull
    private ChangeControlTaskStatus status;
}
