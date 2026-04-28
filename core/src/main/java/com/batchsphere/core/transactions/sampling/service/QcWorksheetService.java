package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.transactions.sampling.dto.QcTestResultResponse;

import java.util.List;
import java.util.UUID;

public interface QcWorksheetService {
    List<QcTestResultResponse> generateWorksheet(UUID sampleId, UUID specId, String analystCode, String actor);
    List<QcTestResultResponse> getWorksheet(UUID sampleId);
    boolean isWorksheetComplete(UUID sampleId);
    boolean hasFailingResults(UUID sampleId);
}
