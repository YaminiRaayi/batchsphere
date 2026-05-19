package com.batchsphere.core.lims.stability.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(name = "stability_timepoint")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StabilityTimepoint {
    @Id
    private UUID id;

    @Column(name = "study_id", nullable = false)
    private UUID studyId;

    @Column(name = "month_offset", nullable = false)
    private Integer monthOffset;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "pulled_date")
    private LocalDate pulledDate;

    @Column(name = "pulled_by", length = 100)
    private String pulledBy;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "SCHEDULED";

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
