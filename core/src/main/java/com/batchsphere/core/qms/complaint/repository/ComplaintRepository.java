package com.batchsphere.core.qms.complaint.repository;

import com.batchsphere.core.qms.complaint.entity.Complaint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ComplaintRepository extends JpaRepository<Complaint, UUID> {

    boolean existsByComplaintNumber(String complaintNumber);

    Page<Complaint> findByIsActiveTrue(Pageable pageable);

    Optional<Complaint> findByIdAndIsActiveTrue(UUID id);

    @Query("select c.status, count(c) from Complaint c where c.isActive = true group by c.status")
    List<Object[]> countActiveByStatus();

    @Query("select c.category, count(c) from Complaint c where c.isActive = true group by c.category")
    List<Object[]> countActiveByCategory();

    @Query("select c.severity, count(c) from Complaint c where c.isActive = true group by c.severity")
    List<Object[]> countActiveBySeverity();

    long countByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end);

    @Query("""
            select count(c)
            from Complaint c
            where c.isActive = true
              and lower(c.productName) = lower(:productName)
              and c.receivedDate between :periodStart and :periodEnd
            """)
    long countByProductNameForApqr(@Param("productName") String productName,
                                   @Param("periodStart") LocalDate periodStart,
                                   @Param("periodEnd") LocalDate periodEnd);
}
