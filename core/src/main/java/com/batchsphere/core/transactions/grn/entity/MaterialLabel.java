package com.batchsphere.core.transactions.grn.entity;

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

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "material_label")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialLabel {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "grn_container_id", nullable = false)
    private UUID grnContainerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "label_type", nullable = false, length = 30)
    private LabelType labelType;

    @Enumerated(EnumType.STRING)
    @Column(name = "label_status", nullable = false, length = 30)
    private LabelStatus labelStatus;

    @Column(name = "label_content", nullable = false, length = 4000)
    private String labelContent;

    @Column(name = "qr_payload", length = 4000)
    private String qrPayload;

    @Column(name = "qr_code_data_url", length = 12000)
    private String qrCodeDataUrl;

    @Column(name = "generated_by", nullable = false, length = 100)
    private String generatedBy;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "applied_by", length = 100)
    private String appliedBy;

    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
}
