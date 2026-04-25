package com.batchsphere.core.transactions.grn.repository;

import com.batchsphere.core.transactions.grn.entity.Grn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface GrnRepository extends JpaRepository<Grn, UUID> {

    boolean existsByGrnNumber(String grnNumber);

    Page<Grn> findByIsActiveTrue(Pageable pageable);

    Page<Grn> findByVendorIdAndIsActiveTrue(UUID vendorId, Pageable pageable);

    @Query("select g.status, count(g) from Grn g where g.isActive = true group by g.status")
    List<Object[]> countActiveByStatus();
}
