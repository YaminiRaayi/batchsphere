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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "stability_result")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StabilityResult {
    @Id
    private UUID id;

    @Column(name = "study_id", nullable = false)
    private UUID studyId;

    @Column(name = "timepoint_id", nullable = false)
    private UUID timepointId;

    @Column(name = "spec_parameter_id", nullable = false)
    private UUID specParameterId;

    @Column(name = "parameter_name", nullable = false)
    private String parameterName;

    @Column(name = "result_value", precision = 18, scale = 6)
    private BigDecimal resultValue;

    @Column(name = "result_text", length = 500)
    private String resultText;

    @Column(length = 50)
    private String unit;

    @Builder.Default
    @Column(name = "oot_flag", nullable = false)
    private Boolean ootFlag = false;

    @Column(name = "entered_by", nullable = false, length = 100)
    private String enteredBy;

    @Column(name = "entered_at", nullable = false)
    private LocalDateTime enteredAt;

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
