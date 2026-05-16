package com.batchsphere.core.qms.document.repository;

import com.batchsphere.core.qms.document.entity.ControlledDocument;
import com.batchsphere.core.qms.document.entity.ControlledDocumentStatus;
import com.batchsphere.core.qms.document.entity.ControlledDocumentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface ControlledDocumentRepository extends JpaRepository<ControlledDocument, UUID> {
    Optional<ControlledDocument> findByIdAndIsActiveTrue(UUID id);

    boolean existsByDocumentNumber(String documentNumber);

    @Query("""
            select d from ControlledDocument d
            where d.isActive = true
              and (:type is null or d.documentType = :type)
              and (:status is null or d.status = :status)
            """)
    Page<ControlledDocument> search(@Param("type") ControlledDocumentType type,
                                    @Param("status") ControlledDocumentStatus status,
                                    Pageable pageable);

    @Query("""
            select d from ControlledDocument d
            where d.isActive = true
              and (:type is null or d.documentType = :type)
              and (:status is null or d.status = :status)
              and (lower(d.documentNumber) like lower(concat('%', :search, '%'))
                   or lower(d.title) like lower(concat('%', :search, '%'))
                   or lower(d.department) like lower(concat('%', :search, '%')))
            """)
    Page<ControlledDocument> searchWithText(@Param("type") ControlledDocumentType type,
                                            @Param("status") ControlledDocumentStatus status,
                                            @Param("search") String search,
                                            Pageable pageable);

    long countByIsActiveTrueAndStatusAndNextReviewDateLessThanEqual(ControlledDocumentStatus status, LocalDate date);

    @Query("""
            select d from ControlledDocument d
            where d.isActive = true
              and d.status = :status
              and d.nextReviewDate is not null
              and d.nextReviewDate <= :cutoff
            order by d.nextReviewDate asc
            """)
    Page<ControlledDocument> findDueForReview(@Param("status") ControlledDocumentStatus status,
                                              @Param("cutoff") LocalDate cutoff,
                                              Pageable pageable);
}
