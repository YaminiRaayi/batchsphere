package com.batchsphere.core.masterdata.spec.service;

import com.batchsphere.core.masterdata.quality.dto.RejectRequest;
import com.batchsphere.core.masterdata.quality.dto.ReviewSubmissionRequest;
import com.batchsphere.core.masterdata.spec.dto.SpecRequest;
import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import com.batchsphere.core.masterdata.spec.entity.Spec;

import java.util.List;
import java.util.UUID;

public interface SpecService {
    Spec createSpec(SpecRequest request);
    Spec getSpecById(UUID id);
    List<Spec> getAllSpecs();
    Spec updateSpec(UUID id, SpecRequest request);
    Spec submitSpec(UUID id, ReviewSubmissionRequest request);
    Spec approveSpec(UUID id);
    Spec rejectSpec(UUID id, RejectRequest request);
    Spec reviseSpec(UUID id);
    Spec obsoleteSpec(UUID id);
    List<Spec> getReviewQueue();
    List<MaterialSpecLink> getMaterialLinks(UUID id);
    void deactivateSpec(UUID id);
}
