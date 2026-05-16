package com.batchsphere.core.qms.riskassessment.repository;

import com.batchsphere.core.qms.riskassessment.entity.RiskItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface RiskItemRepository extends JpaRepository<RiskItem, UUID> {

    List<RiskItem> findByRiskAssessmentIdAndIsActiveTrueOrderBySequenceNumber(UUID riskAssessmentId);

    long countByRiskAssessmentIdAndIsActiveTrueAndRpnGreaterThanEqual(UUID riskAssessmentId, int rpn);

    long countByRiskAssessmentIdAndIsActiveTrueAndSeverity(UUID riskAssessmentId, int severity);

    int countByRiskAssessmentIdAndIsActiveTrue(UUID riskAssessmentId);

    @Query("select count(ri) from RiskItem ri where ri.isActive = true and ri.severity = 5")
    long countAllActiveCritical();

    @Query("select count(distinct ra.id) from RiskAssessment ra join RiskItem ri on ri.riskAssessmentId = ra.id where ra.isActive = true and ri.isActive = true and ri.rpn >= 50")
    long countAssessmentsWithHighRpn();
}
