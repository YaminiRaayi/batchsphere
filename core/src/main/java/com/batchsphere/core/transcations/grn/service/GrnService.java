package com.batchsphere.core.transcations.grn.service;

import com.batchsphere.core.transcations.grn.dto.CreateGrnRequest;
import com.batchsphere.core.transcations.grn.dto.ContainerSamplingLabelRequest;
import com.batchsphere.core.transcations.grn.dto.GrnContainerResponse;
import com.batchsphere.core.transcations.grn.dto.GrnResponse;
import com.batchsphere.core.transcations.grn.dto.MaterialLabelResponse;
import com.batchsphere.core.transcations.grn.dto.UpdateGrnRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface GrnService {

    GrnResponse createGrn(CreateGrnRequest request);

    GrnResponse getGrnById(UUID id);

    Page<GrnResponse> getAllGrns(Pageable pageable);

    GrnResponse updateGrn(UUID id, UpdateGrnRequest request);

    GrnResponse receiveGrn(UUID id, String updatedBy);
    List<GrnContainerResponse> getContainersByGrnItemId(UUID grnItemId);
    List<MaterialLabelResponse> getLabelsByContainerId(UUID containerId);
    GrnContainerResponse applySamplingLabel(UUID containerId, ContainerSamplingLabelRequest request);

    GrnResponse cancelGrn(UUID id, String updatedBy);

    void deactivateGrn(UUID id, String updatedBy);
}
