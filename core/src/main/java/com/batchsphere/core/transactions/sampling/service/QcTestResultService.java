package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.transactions.sampling.dto.QcTestResultResponse;
import com.batchsphere.core.transactions.sampling.dto.RecordQcTestResultRequest;

import java.util.UUID;

public interface QcTestResultService {
    QcTestResultResponse recordResult(UUID testResultId, RecordQcTestResultRequest request, String actor);
}
