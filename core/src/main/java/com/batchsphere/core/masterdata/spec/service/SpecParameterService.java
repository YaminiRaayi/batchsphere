package com.batchsphere.core.masterdata.spec.service;

import com.batchsphere.core.masterdata.spec.dto.SpecParameterRequest;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;

import java.util.List;
import java.util.UUID;

public interface SpecParameterService {
    SpecParameter createParameter(UUID specId, SpecParameterRequest request);
    List<SpecParameter> getParameters(UUID specId);
    SpecParameter updateParameter(UUID specId, UUID parameterId, SpecParameterRequest request);
    void deleteParameter(UUID specId, UUID parameterId);
}
