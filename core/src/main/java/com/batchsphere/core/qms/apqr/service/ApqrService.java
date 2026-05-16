package com.batchsphere.core.qms.apqr.service;

import com.batchsphere.core.qms.apqr.dto.ApqrDTO.*;
import com.batchsphere.core.qms.apqr.entity.Apqr.ApqrStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ApqrService {
  ApqrResponse createApqr(CreateApqrRequest request);
  ApqrResponse getApqr(UUID id);
  Page<ApqrResponse> listApqrs(Integer year, UUID materialId, ApqrStatus status, Pageable pageable);
  ApqrResponse compileApqr(UUID id);
  ApqrResponse updateConclusions(UUID id, ApqrConclusionRequest request);
  ApqrResponse approveApqr(UUID id, ApproveApqrRequest request);
  ApqrResponse closeApqr(UUID id);
  List<ApqrSummaryItem> getApqrSummary();
  List<ApqrResponse> getApqrsInProgress();
}