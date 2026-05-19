package com.batchsphere.core.transactions.sampling.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CsvImportErrorResponse {
    private Integer row;
    private String parameterName;
    private String error;
}
