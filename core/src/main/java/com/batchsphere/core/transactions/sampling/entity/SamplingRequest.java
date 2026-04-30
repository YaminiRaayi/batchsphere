package com.batchsphere.core.transactions.sampling.entity;

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
@Table(name = "sampling_request")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SamplingRequest {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "grn_id", nullable = false)
    private UUID grnId;

    @Column(name = "grn_item_id", nullable = false)
    private UUID grnItemId;

    @Column(name = "parent_sampling_request_id")
    private UUID parentSamplingRequestId;

    @Column(name = "root_sampling_request_id", nullable = false)
    private UUID rootSamplingRequestId;

    @Column(name = "cycle_number", nullable = false)
    private Integer cycleNumber;

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "warehouse_location", nullable = false, length = 150)
    private String warehouseLocation;

    @Column(name = "pallet_id", nullable = false)
    private UUID palletId;

    @Column(name = "total_containers", nullable = false)
    private Integer totalContainers;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_status", nullable = false, length = 30)
    private SamplingRequestStatus requestStatus;

    @Column(name = "warehouse_label_applied", nullable = false)
    private Boolean warehouseLabelApplied;

    @Column(name = "sampling_label_required", nullable = false)
    private Boolean samplingLabelRequired;

    @Column(name = "vendor_coa_release_allowed", nullable = false)
    private Boolean vendorCoaReleaseAllowed;

    @Column(name = "photosensitive_material", nullable = false)
    private Boolean photosensitiveMaterial;

    @Column(name = "hygroscopic_material", nullable = false)
    private Boolean hygroscopicMaterial;

    @Column(name = "hazardous_material", nullable = false)
    private Boolean hazardousMaterial;

    @Column(name = "selective_material", nullable = false)
    private Boolean selectiveMaterial;

    @Column(length = 500)
    private String remarks;

    @Column(name = "resample_reason", length = 1000)
    private String resampleReason;

    @Column(name = "qc_decision_remarks", length = 1000)
    private String qcDecisionRemarks;

    @Column(name = "qc_decided_by", length = 100)
    private String qcDecidedBy;

    @Column(name = "qc_decided_at")
    private LocalDateTime qcDecidedAt;

    @Column(name = "qc_decision_confirmed_by", length = 100)
    private String qcDecisionConfirmedBy;

    @Column(name = "qc_decision_confirmation_text", length = 120)
    private String qcDecisionConfirmationText;

    @Column(name = "qc_decision_confirmation_at")
    private LocalDateTime qcDecisionConfirmationAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
