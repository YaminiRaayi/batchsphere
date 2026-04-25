package com.batchsphere.core.masterdata.material.repository;

import com.batchsphere.core.masterdata.material.entity.Material;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface MaterialRepository extends JpaRepository<Material, UUID> {

    Optional<Material> findByMaterialCode(String materialCode);

    boolean existsByMaterialCode(String materialCode);

    List<Material> findByMaterialCodeStartingWith(String prefix);

    Page<Material> findByIsActiveTrue(Pageable pageable);

    List<Material> findByIsActiveTrueOrderByMaterialCodeAsc();
}
