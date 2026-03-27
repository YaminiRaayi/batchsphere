package com.batchsphere.core.masterdata.samplingtool.repository;

import com.batchsphere.core.masterdata.samplingtool.entity.SamplingTool;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SamplingToolRepository extends JpaRepository<SamplingTool, UUID> {
    boolean existsByToolCode(String toolCode);
    List<SamplingTool> findByIsActiveTrueOrderByToolCodeAsc();
}
