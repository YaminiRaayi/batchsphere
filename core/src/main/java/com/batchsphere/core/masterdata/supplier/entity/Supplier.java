package com.batchsphere.core.masterdata.supplier.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "supplier")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Supplier {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String supplierCode;

    @Column(nullable = false)
    private String supplierName;

    private String contactPerson;

    private String email;

    private String phone;

    private Boolean isActive;

    private String createdBy;

    private LocalDateTime createdAt;

    private String updatedBy;

    private LocalDateTime updatedAt;
}