package com.batchsphere.core.masterdata.vendorbusinessunit.service;

import com.batchsphere.core.masterdata.vendorbusinessunit.dto.CreateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.UpdateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorAuditRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorAuditResponse;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorDocumentResponse;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface VendorBusinessUnitService {

    VendorBusinessUnit createVendorBusinessUnit(UUID vendorId, CreateVendorBusinessUnitRequest request);

    VendorBusinessUnit getVendorBusinessUnitById(UUID id);

    Page<VendorBusinessUnit> getAllVendorBusinessUnits(UUID vendorId, Pageable pageable);

    VendorBusinessUnit updateVendorBusinessUnit(UUID vendorId, UUID id, UpdateVendorBusinessUnitRequest request);

    void deactivateVendorBusinessUnit(UUID id);

    List<VendorDocumentResponse> getVendorDocuments(UUID businessUnitId);

    VendorDocumentResponse uploadVendorDocument(
            UUID businessUnitId,
            String documentTitle,
            String documentType,
            LocalDate expiryDate,
            MultipartFile file
    );

    void deleteVendorDocument(UUID businessUnitId, UUID documentId);

    Resource loadVendorDocumentFile(UUID businessUnitId, UUID documentId);

    List<VendorAuditResponse> getVendorAudits(UUID businessUnitId);

    VendorAuditResponse createVendorAudit(UUID businessUnitId, VendorAuditRequest request);

    VendorAuditResponse updateVendorAudit(UUID businessUnitId, UUID auditId, VendorAuditRequest request);
}
