package com.batchsphere.core.masterdata.samplingtool.service;

import com.batchsphere.core.masterdata.samplingtool.dto.SamplingToolRequest;
import com.batchsphere.core.masterdata.samplingtool.entity.SamplingTool;

import java.util.List;
import java.util.UUID;

public interface SamplingToolService {
    SamplingTool createSamplingTool(SamplingToolRequest request);
    SamplingTool getSamplingToolById(UUID id);
    List<SamplingTool> getAllSamplingTools();
    SamplingTool updateSamplingTool(UUID id, SamplingToolRequest request);
    void deactivateSamplingTool(UUID id);
}
