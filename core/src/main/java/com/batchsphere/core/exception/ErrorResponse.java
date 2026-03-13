package com.batchsphere.core.exception;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ErrorResponse {

    private String message;
    private String details;
    private LocalDateTime timestamp;

}
