package com.batchsphere.core.transactions.grn.repository;

import com.batchsphere.core.transactions.grn.entity.Grn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GrnRepository extends JpaRepository<Grn, UUID> {

    boolean existsByGrnNumber(String grnNumber);

    Page<Grn> findByIsActiveTrue(Pageable pageable);
}
