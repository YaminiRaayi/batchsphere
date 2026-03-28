package com.batchsphere.core.masterdata.warehouselocation.repository;

import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PalletRepository extends JpaRepository<Pallet, UUID> {

    boolean existsByShelfIdAndPalletCode(UUID shelfId, String palletCode);

    Page<Pallet> findByIsActiveTrue(Pageable pageable);

    Page<Pallet> findByShelfIdAndIsActiveTrue(UUID shelfId, Pageable pageable);
}
