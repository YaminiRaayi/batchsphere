package com.batchsphere.core.masterdata.spec.repository;

import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SpecParameterRepository extends JpaRepository<SpecParameter, UUID> {
    List<SpecParameter> findBySpecIdAndIsActiveTrueOrderBySequenceAsc(UUID specId);
}
