package com.batchsphere.core.transactions.grn.service;

import com.batchsphere.core.transactions.grn.dto.CreateGrnRequest;
import com.batchsphere.core.transactions.grn.dto.ContainerSamplingLabelRequest;
import com.batchsphere.core.transactions.grn.dto.GrnContainerResponse;
import com.batchsphere.core.transactions.grn.dto.GrnDocumentResponse;
import com.batchsphere.core.transactions.grn.dto.GrnDocumentUploadRequest;
import com.batchsphere.core.transactions.grn.dto.GrnResponse;
import com.batchsphere.core.transactions.grn.dto.MaterialLabelResponse;
import com.batchsphere.core.transactions.grn.dto.UpdateGrnRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

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
    GrnDocumentResponse uploadDocument(UUID grnItemId, GrnDocumentUploadRequest request, MultipartFile file);

    GrnResponse cancelGrn(UUID id, String updatedBy);

    void deactivateGrn(UUID id, String updatedBy);
}
