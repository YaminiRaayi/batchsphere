package com.batchsphere.core.masterdata.moa.service;

import com.batchsphere.core.masterdata.quality.dto.RejectRequest;
import com.batchsphere.core.masterdata.quality.dto.ReviewSubmissionRequest;
import com.batchsphere.core.masterdata.moa.dto.MoaRequest;
import com.batchsphere.core.masterdata.moa.entity.Moa;

import java.util.List;
import java.util.UUID;

public interface MoaService {
    Moa createMoa(MoaRequest request);
    Moa getMoaById(UUID id);
    List<Moa> getAllMoas();
    Moa updateMoa(UUID id, MoaRequest request);
    Moa submitMoa(UUID id, ReviewSubmissionRequest request);
    Moa approveMoa(UUID id);
    Moa rejectMoa(UUID id, RejectRequest request);
    Moa obsoleteMoa(UUID id);
    List<Moa> getReviewQueue();
    void deactivateMoa(UUID id);
}
