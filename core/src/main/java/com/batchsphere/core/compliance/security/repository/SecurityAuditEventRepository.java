package com.batchsphere.core.compliance.security.repository;

import com.batchsphere.core.compliance.security.entity.SecurityAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface SecurityAuditEventRepository extends JpaRepository<SecurityAuditEvent, UUID> {

    List<SecurityAuditEvent> findByUsernameAndOccurredAtBetweenOrderByOccurredAtDesc(
            String username, OffsetDateTime from, OffsetDateTime to);

    List<SecurityAuditEvent> findByOccurredAtBetweenOrderByOccurredAtDesc(
            OffsetDateTime from, OffsetDateTime to);
}
