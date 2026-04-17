package com.batchsphere.core.masterdata.warehouselocation.entity;

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
@Table(name = "shelf")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Shelf {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "rack_id", nullable = false)
    private UUID rackId;

    @Column(name = "shelf_code", nullable = false, length = 50)
    private String shelfCode;

    @Column(name = "shelf_name", nullable = false, length = 150)
    private String shelfName;

    @Column(length = 500)
    private String description;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
