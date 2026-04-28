package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.SampleContainerLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SampleContainerLinkRepository extends JpaRepository<SampleContainerLink, UUID> {
    List<SampleContainerLink> findBySampleIdOrderByContainerNumber(UUID sampleId);
    void deleteBySampleId(UUID sampleId);
}
