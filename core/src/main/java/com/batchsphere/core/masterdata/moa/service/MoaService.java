package com.batchsphere.core.masterdata.moa.service;

import com.batchsphere.core.masterdata.moa.dto.MoaRequest;
import com.batchsphere.core.masterdata.moa.entity.Moa;

import java.util.List;

public interface MoaService {
    Moa createMoa(MoaRequest request);
    List<Moa> getAllMoas();
}
