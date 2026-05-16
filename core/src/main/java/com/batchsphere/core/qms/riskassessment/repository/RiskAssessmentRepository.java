package com.batchsphere.core.qms.riskassessment.repository;

import com.batchsphere.core.qms.riskassessment.entity.RiskAssessment;
import com.batchsphere.core.qms.riskassessment.entity.RiskAssessmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RiskAssessmentRepository extends JpaRepository<RiskAssessment, UUID> {

    boolean existsByAssessmentNumber(String assessmentNumber);

    Page<RiskAssessment> findByIsActiveTrue(Pageable pageable);

    Optional<RiskAssessment> findByIdAndIsActiveTrue(UUID id);

    long countByIsActiveTrue();

    long countByStatusAndIsActiveTrue(RiskAssessmentStatus status);
}
