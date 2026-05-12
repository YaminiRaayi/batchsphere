package com.batchsphere.core.hrms.training.repository;

import com.batchsphere.core.hrms.training.entity.RoleQualificationRequirement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoleQualificationRequirementRepository extends JpaRepository<RoleQualificationRequirement, UUID> {

    List<RoleQualificationRequirement> findByIsActiveTrueOrderByRoleNameAscTrainingTitleAsc();
}
