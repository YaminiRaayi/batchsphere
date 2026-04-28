package com.batchsphere.core.transactions.sampling.entity;

import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qc_test_result")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QcTestResult {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sample_id", nullable = false)
    private UUID sampleId;

    @Column(name = "spec_parameter_id", nullable = false)
    private UUID specParameterId;

    @Column(name = "moa_id_used")
    private UUID moaIdUsed;

    @Column(name = "analyst_code", nullable = false, length = 100)
    private String analystCode;

    @Column(name = "result_value", precision = 18, scale = 6)
    private BigDecimal resultValue;

    @Column(name = "result_text", length = 500)
    private String resultText;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private QcTestResultStatus status;

    @Column(name = "pass_fail_flag")
    private Boolean passFailFlag;

    @Column(name = "lower_limit_applied", precision = 18, scale = 4)
    private BigDecimal lowerLimitApplied;

    @Column(name = "upper_limit_applied", precision = 18, scale = 4)
    private BigDecimal upperLimitApplied;

    @Enumerated(EnumType.STRING)
    @Column(name = "criteria_type_applied", nullable = false, length = 50)
    private SpecParameterCriteriaType criteriaTypeApplied;

    @Column(name = "unit_applied", length = 50)
    private String unitApplied;

    @Column(name = "entered_at")
    private LocalDateTime enteredAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "remarks", length = 500)
    private String remarks;

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
