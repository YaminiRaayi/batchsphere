package com.batchsphere.core.masterdata.spec.service;

import com.batchsphere.core.masterdata.spec.dto.SpecRequest;
import com.batchsphere.core.masterdata.spec.entity.Spec;

import java.util.List;

public interface SpecService {
    Spec createSpec(SpecRequest request);
    List<Spec> getAllSpecs();
}
