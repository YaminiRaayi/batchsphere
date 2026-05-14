package com.batchsphere.core.qms.capa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qms_capa_reassignment")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CapaReassignment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "capa_id", nullable = false)
    private UUID capaId;

    @Column(name = "previous_owner", nullable = false, length = 100)
    private String previousOwner;

    @Column(name = "new_owner", nullable = false, length = 100)
    private String newOwner;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "assigned_by", nullable = false, length = 100)
    private String assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;
}
