package com.batchsphere.core.masterdata.spec.repository;

import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaterialSpecLinkRepository extends JpaRepository<MaterialSpecLink, UUID> {
    Optional<MaterialSpecLink> findByMaterialIdAndIsActiveTrue(UUID materialId);
    List<MaterialSpecLink> findByMaterialIdOrderByLinkedAtDesc(UUID materialId);
    List<MaterialSpecLink> findBySpecIdAndDelinkedAtIsNullOrderByCreatedAtAsc(UUID specId);
}
