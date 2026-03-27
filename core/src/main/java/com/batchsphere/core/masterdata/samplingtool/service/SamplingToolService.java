package com.batchsphere.core.masterdata.samplingtool.service;

import com.batchsphere.core.masterdata.samplingtool.dto.SamplingToolRequest;
import com.batchsphere.core.masterdata.samplingtool.entity.SamplingTool;

import java.util.List;

public interface SamplingToolService {
    SamplingTool createSamplingTool(SamplingToolRequest request);
    List<SamplingTool> getAllSamplingTools();
}
