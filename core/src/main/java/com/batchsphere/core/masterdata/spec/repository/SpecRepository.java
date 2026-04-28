package com.batchsphere.core.masterdata.spec.repository;

import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.entity.SpecStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SpecRepository extends JpaRepository<Spec, UUID> {
    boolean existsBySpecCode(String specCode);
    boolean existsBySpecCodeAndRevision(String specCode, String revision);
    List<Spec> findByIsActiveTrueOrderBySpecCodeAsc();
    List<Spec> findByIsActiveTrueAndStatusOrderBySpecCodeAsc(SpecStatus status);
    boolean existsByPreviousSpecIdAndIsActiveTrueAndStatusIn(UUID previousSpecId, List<SpecStatus> statuses);
}
