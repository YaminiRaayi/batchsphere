package com.batchsphere.core.qms.batchrelease.service;

import com.batchsphere.core.qms.batchrelease.dto.QpBatchReleaseDTO.*;
import com.batchsphere.core.qms.batchrelease.entity.BatchReleaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface QpBatchReleaseService {
  QpBatchReleaseResponse createBatchRelease(CreateQpBatchReleaseRequest request);
  QpBatchReleaseResponse getBatchRelease(UUID id);
  Page<QpBatchReleaseResponse> listBatchReleases(BatchReleaseStatus status, UUID materialId, Pageable pageable);
  QpBatchReleaseResponse certifyBatch(UUID id, CertifyBatchRequest request);
  QpBatchReleaseResponse rejectBatch(UUID id, RejectBatchRequest request);
  BatchCertificateResponse getBatchCertificate(UUID id);

  CoaResponse analystSignCoa(UUID id, AnalystSignCoaRequest request, String actor);
  CoaResponse issueCoa(UUID id, IssueCoaRequest request, String actor);
  CoaResponse getCoaDetails(UUID id);
  byte[] getCoaPdf(UUID id, String actor);
}
