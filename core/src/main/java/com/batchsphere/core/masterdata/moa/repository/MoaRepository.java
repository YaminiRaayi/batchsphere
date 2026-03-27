package com.batchsphere.core.masterdata.moa.repository;

import com.batchsphere.core.masterdata.moa.entity.Moa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MoaRepository extends JpaRepository<Moa, UUID> {
    boolean existsByMoaCode(String moaCode);
    List<Moa> findByIsActiveTrueOrderByMoaCodeAsc();
}
