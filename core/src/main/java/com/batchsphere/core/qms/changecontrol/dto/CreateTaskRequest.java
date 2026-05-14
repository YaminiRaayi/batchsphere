package com.batchsphere.core.qms.changecontrol.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateTaskRequest {
    @NotBlank
    private String title;
    private String description;
    private String assignedTo;
    private LocalDate dueDate;
}
