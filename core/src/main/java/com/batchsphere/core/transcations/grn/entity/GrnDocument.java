package com.batchsphere.core.transcations.grn.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "grn_document")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrnDocument {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "grn_id", nullable = false)
    private UUID grnId;

    @Column(name = "grn_item_id", nullable = false)
    private UUID grnItemId;

    @Column(name = "document_name", nullable = false, length = 255)
    private String documentName;

    @Column(name = "document_type", nullable = false, length = 100)
    private String documentType;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "document_path", length = 1000)
    private String documentPath;

    @Column(name = "document_url", length = 1000)
    private String documentUrl;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
