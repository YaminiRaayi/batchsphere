package com.batchsphere.core.masterdata.vendor.service;

import com.batchsphere.core.masterdata.vendor.dto.VendorApprovalRequest;
import com.batchsphere.core.masterdata.vendor.dto.VendorDocumentResponse;
import com.batchsphere.core.masterdata.vendor.dto.VendorRequest;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface VendorService {

    Vendor createVendor(VendorRequest request);

    Vendor getVendorById(UUID id);

    Page<Vendor> getAllVendors(Pageable pageable);

    Vendor updateVendor(UUID id, VendorRequest request);

    Vendor updateVendorApproval(UUID id, VendorApprovalRequest request);

    void deactivateVendor(UUID id);

    List<VendorDocumentResponse> getVendorDocuments(UUID vendorId);

    VendorDocumentResponse uploadVendorDocument(
            UUID vendorId,
            String documentTitle,
            String documentType,
            LocalDate expiryDate,
            MultipartFile file
    );

    void deleteVendorDocument(UUID vendorId, UUID documentId);

    Resource loadVendorDocumentFile(UUID vendorId, UUID documentId);
}
