package com.batchsphere.core.masterdata.vendor.dto;

import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorDocumentStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorDocumentType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class VendorDocumentResponse {
    UUID id;
    UUID vendorId;
    VendorDocumentType documentType;
    String documentTitle;
    String fileName;
    String storagePath;
    LocalDateTime uploadedAt;
    LocalDate expiryDate;
    VendorDocumentStatus status;
    String uploadedBy;
}
