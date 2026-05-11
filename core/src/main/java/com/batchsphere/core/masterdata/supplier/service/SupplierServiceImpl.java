package com.batchsphere.core.masterdata.supplier.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierRequest;
import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierResponse;
import com.batchsphere.core.masterdata.supplier.entity.Supplier;
import com.batchsphere.core.masterdata.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public SupplierResponse createSupplier(SupplierRequest request) {
        String actor = authenticatedActorService.currentActor();
        supplierRepository.findBySupplierCode(request.getSupplierCode())
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Supplier code already exists: " + request.getSupplierCode());
                });

        Supplier supplier = Supplier.builder()
                .id(UUID.randomUUID())
                .supplierCode(request.getSupplierCode())
                .supplierName(request.getSupplierName())
                .contactPerson(request.getContactPerson())
                .email(request.getEmail())
                .phone(request.getPhone())
                .supplierType(request.getSupplierType())
                .qualificationStatus(request.getQualificationStatus())
                .countryOfManufacture(request.getCountryOfManufacture())
                .gmpcertNumber(request.getGmpcertNumber())
                .gmpcertIssuingAuthority(request.getGmpcertIssuingAuthority())
                .gmpcertExpiryDate(request.getGmpcertExpiryDate())
                .approvedSince(request.getApprovedSince())
                .lastAuditDate(request.getLastAuditDate())
                .nextAuditDue(request.getNextAuditDue())
                .rejectionRate(request.getRejectionRate())
                .openCapaCount(request.getOpenCapaCount() == null ? 0 : request.getOpenCapaCount())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        return toResponse(supplierRepository.save(supplier));
    }

    @Override
    public SupplierResponse getSupplier(UUID id) {
        return toResponse(getSupplierEntity(id));
    }

    @Override
    public List<SupplierResponse> getAllSuppliers() {
        return supplierRepository.findAll().stream()
                .filter(supplier -> Boolean.TRUE.equals(supplier.getIsActive()))
                .map(this::toResponse)
                .toList();
    }

    @Override
    public SupplierResponse updateSupplier(UUID id, SupplierRequest request) {
        String actor = authenticatedActorService.currentActor();
        Supplier supplier = getSupplierEntity(id);

        if (!supplier.getSupplierCode().equals(request.getSupplierCode())) {
            supplierRepository.findBySupplierCode(request.getSupplierCode())
                    .ifPresent(existing -> {
                        throw new DuplicateResourceException("Supplier code already exists: " + request.getSupplierCode());
                    });
        }

        supplier.setSupplierCode(request.getSupplierCode());
        supplier.setSupplierName(request.getSupplierName());
        supplier.setContactPerson(request.getContactPerson());
        supplier.setEmail(request.getEmail());
        supplier.setPhone(request.getPhone());
        supplier.setSupplierType(request.getSupplierType());
        supplier.setQualificationStatus(request.getQualificationStatus());
        supplier.setCountryOfManufacture(request.getCountryOfManufacture());
        supplier.setGmpcertNumber(request.getGmpcertNumber());
        supplier.setGmpcertIssuingAuthority(request.getGmpcertIssuingAuthority());
        supplier.setGmpcertExpiryDate(request.getGmpcertExpiryDate());
        supplier.setApprovedSince(request.getApprovedSince());
        supplier.setLastAuditDate(request.getLastAuditDate());
        supplier.setNextAuditDue(request.getNextAuditDue());
        supplier.setRejectionRate(request.getRejectionRate());
        supplier.setOpenCapaCount(request.getOpenCapaCount() == null ? 0 : request.getOpenCapaCount());
        supplier.setUpdatedBy(actor);
        supplier.setUpdatedAt(LocalDateTime.now());

        return toResponse(supplierRepository.save(supplier));
    }

    @Override
    public void deactivateSupplier(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Supplier supplier = getSupplierEntity(id);
        supplier.setIsActive(false);
        supplier.setUpdatedBy(actor);
        supplier.setUpdatedAt(LocalDateTime.now());
        supplierRepository.save(supplier);
    }

    private Supplier getSupplierEntity(UUID id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
    }

    private SupplierResponse toResponse(Supplier supplier) {
        return SupplierResponse.builder()
                .id(supplier.getId())
                .supplierCode(supplier.getSupplierCode())
                .supplierName(supplier.getSupplierName())
                .contactPerson(supplier.getContactPerson())
                .email(supplier.getEmail())
                .phone(supplier.getPhone())
                .supplierType(supplier.getSupplierType())
                .qualificationStatus(supplier.getQualificationStatus())
                .countryOfManufacture(supplier.getCountryOfManufacture())
                .gmpcertNumber(supplier.getGmpcertNumber())
                .gmpcertIssuingAuthority(supplier.getGmpcertIssuingAuthority())
                .gmpcertExpiryDate(supplier.getGmpcertExpiryDate())
                .approvedSince(supplier.getApprovedSince())
                .lastAuditDate(supplier.getLastAuditDate())
                .nextAuditDue(supplier.getNextAuditDue())
                .rejectionRate(supplier.getRejectionRate())
                .openCapaCount(supplier.getOpenCapaCount())
                .isActive(supplier.getIsActive())
                .createdBy(supplier.getCreatedBy())
                .createdAt(supplier.getCreatedAt())
                .updatedBy(supplier.getUpdatedBy())
                .updatedAt(supplier.getUpdatedAt())
                .build();
    }
}
