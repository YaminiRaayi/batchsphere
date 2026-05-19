package com.batchsphere.core.exception;

import com.batchsphere.core.transactions.sampling.dto.CsvImportErrorResponse;
import lombok.Getter;

import java.util.List;

@Getter
public class CsvImportException extends RuntimeException {
    private final List<CsvImportErrorResponse> errors;

    public CsvImportException(List<CsvImportErrorResponse> errors) {
        super("CSV import failed");
        this.errors = errors;
    }
}
