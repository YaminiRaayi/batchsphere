package com.batchsphere.core.masterdata.vendorbusinessunit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity(name = "VendorBusinessUnitDocument")
@Table(name = "vendor_document")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorDocument {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "bu_id", nullable = false)
    private UUID buId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 100)
    private VendorDocumentType documentType;

    @Column(name = "document_title", nullable = false, length = 255)
    private String documentTitle;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private VendorDocumentStatus status;

    @Column(name = "uploaded_by", nullable = false, length = 100)
    private String uploadedBy;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
}
