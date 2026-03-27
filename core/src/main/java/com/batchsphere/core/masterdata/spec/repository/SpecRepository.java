package com.batchsphere.core.masterdata.spec.repository;

import com.batchsphere.core.masterdata.spec.entity.Spec;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SpecRepository extends JpaRepository<Spec, UUID> {
    boolean existsBySpecCode(String specCode);
    List<Spec> findByIsActiveTrueOrderBySpecCodeAsc();
}
