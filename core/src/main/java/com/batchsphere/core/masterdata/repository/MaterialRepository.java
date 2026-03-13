package com.batchsphere.core.masterdata.repository;

import com.batchsphere.core.masterdata.entity.Material;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MaterialRepository extends JpaRepository<Material, UUID> {

    Optional<Material> findByMaterialCode(String materialCode);

    boolean existsByMaterialCode(String materialCode);

    Page<Material> findByIsActiveTrue(Pageable pageable);
}
