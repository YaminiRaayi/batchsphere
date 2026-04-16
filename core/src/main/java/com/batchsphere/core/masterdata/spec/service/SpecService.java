package com.batchsphere.core.masterdata.spec.service;

import com.batchsphere.core.masterdata.spec.dto.SpecRequest;
import com.batchsphere.core.masterdata.spec.entity.Spec;

import java.util.List;
import java.util.UUID;

public interface SpecService {
    Spec createSpec(SpecRequest request);
    Spec getSpecById(UUID id);
    List<Spec> getAllSpecs();
    Spec updateSpec(UUID id, SpecRequest request);
    void deactivateSpec(UUID id);
}
