package com.batchsphere.core.compliance.delegation.repository;

import com.batchsphere.core.compliance.delegation.entity.ApprovalDelegation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApprovalDelegationRepository extends JpaRepository<ApprovalDelegation, UUID> {

    List<ApprovalDelegation> findByIsActiveTrueOrderByValidUntilAsc();

    Optional<ApprovalDelegation> findByIdAndIsActiveTrue(UUID id);

    @Query("""
            select d from ApprovalDelegation d
            where d.isActive = true
              and lower(d.delegatorUsername) = lower(:delegator)
              and lower(d.delegateUsername) = lower(:delegate)
              and d.validFrom <= :now
              and d.validUntil >= :now
              and (d.scopeEntityType is null or upper(d.scopeEntityType) = upper(:entityType))
              and (d.scopeAction is null or upper(d.scopeAction) = upper(:action))
            """)
    Optional<ApprovalDelegation> findActiveDelegation(@Param("delegator") String delegator,
                                                      @Param("delegate") String delegate,
                                                      @Param("entityType") String entityType,
                                                      @Param("action") String action,
                                                      @Param("now") LocalDateTime now);
}
