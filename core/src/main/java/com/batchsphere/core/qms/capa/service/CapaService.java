package com.batchsphere.core.qms.capa.service;

import com.batchsphere.core.qms.capa.dto.CapaResponse;
import com.batchsphere.core.qms.capa.dto.CapaStatusUpdateRequest;
import com.batchsphere.core.qms.capa.dto.CapaSummaryResponse;
import com.batchsphere.core.qms.capa.dto.CreateCapaRequest;
import com.batchsphere.core.qms.capa.dto.UpdateCapaRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CapaService {
    CapaResponse createCapa(CreateCapaRequest request);

    Page<CapaResponse> getAllCapas(UUID deviationId, Pageable pageable);

    CapaResponse getCapaById(UUID id);

    CapaResponse updateCapa(UUID id, UpdateCapaRequest request);

    CapaResponse updateStatus(UUID id, CapaStatusUpdateRequest request);

    CapaSummaryResponse getSummary();
}
