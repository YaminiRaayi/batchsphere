package com.batchsphere.core.qms.changecontrol.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "qms_change_control_affected_entity")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ChangeControlAffectedEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "change_control_id", nullable = false)
    private UUID changeControlId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 40)
    private AffectedEntityType entityType;

    @Column(name = "entity_reference", nullable = false, length = 255)
    private String entityReference;

    @Column(name = "entity_id")
    private UUID entityId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "entity_display_name", length = 255)
    private String entityDisplayName;

    @Column(name = "entity_number", length = 100)
    private String entityNumber;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
