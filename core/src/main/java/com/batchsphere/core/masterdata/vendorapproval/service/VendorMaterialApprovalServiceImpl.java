package com.batchsphere.core.masterdata.vendorapproval.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.supplier.repository.SupplierRepository;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorapproval.dto.VendorMaterialApprovalRequest;
import com.batchsphere.core.masterdata.vendorapproval.dto.VendorMaterialApprovalResponse;
import com.batchsphere.core.masterdata.vendorapproval.entity.VendorMaterialApproval;
import com.batchsphere.core.masterdata.vendorapproval.entity.VendorMaterialApprovalStatus;
import com.batchsphere.core.masterdata.vendorapproval.repository.VendorMaterialApprovalRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VendorMaterialApprovalServiceImpl implements VendorMaterialApprovalService {

    private final VendorMaterialApprovalRepository repository;
    private final VendorRepository vendorRepository;
    private final VendorBusinessUnitRepository vendorBusinessUnitRepository;
    private final SupplierRepository supplierRepository;
    private final MaterialRepository materialRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    @Transactional
    public VendorMaterialApprovalResponse createApproval(VendorMaterialApprovalRequest request) {
        String actor = authenticatedActorService.currentActor();
        validateReferences(request);
        repository.findByVendorIdAndVendorBusinessUnitIdAndSupplierIdAndMaterialIdAndIsActiveTrue(
                        request.getVendorId(),
                        request.getVendorBusinessUnitId(),
                        request.getSupplierId(),
                        request.getMaterialId())
                .ifPresent(existing -> {
                    throw new BusinessConflictException("Approval already exists for the provided vendor, site, supplier, and material");
                });

        VendorMaterialApproval approval = VendorMaterialApproval.builder()
                .id(UUID.randomUUID())
                .vendorId(request.getVendorId())
                .vendorBusinessUnitId(request.getVendorBusinessUnitId())
                .supplierId(request.getSupplierId())
                .materialId(request.getMaterialId())
                .status(request.getStatus())
                .approvalBasis(request.getApprovalBasis())
                .qualificationDate(request.getQualificationDate())
                .nextRequalificationDate(request.getNextRequalificationDate())
                .approvedBy(normalizeApprover(request.getApprovedBy(), actor))
                .remarks(blankToNull(request.getRemarks()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        return toResponse(repository.save(approval));
    }

    @Override
    @Transactional
    public VendorMaterialApprovalResponse updateApproval(UUID id, VendorMaterialApprovalRequest request) {
        String actor = authenticatedActorService.currentActor();
        validateReferences(request);
        VendorMaterialApproval approval = getActiveApproval(id);
        repository.findByVendorIdAndVendorBusinessUnitIdAndSupplierIdAndMaterialIdAndIsActiveTrue(
                        request.getVendorId(),
                        request.getVendorBusinessUnitId(),
                        request.getSupplierId(),
                        request.getMaterialId())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new BusinessConflictException("Approval already exists for the provided vendor, site, supplier, and material");
                });

        approval.setVendorId(request.getVendorId());
        approval.setVendorBusinessUnitId(request.getVendorBusinessUnitId());
        approval.setSupplierId(request.getSupplierId());
        approval.setMaterialId(request.getMaterialId());
        approval.setStatus(request.getStatus());
        approval.setApprovalBasis(request.getApprovalBasis());
        approval.setQualificationDate(request.getQualificationDate());
        approval.setNextRequalificationDate(request.getNextRequalificationDate());
        approval.setApprovedBy(normalizeApprover(request.getApprovedBy(), actor));
        approval.setRemarks(blankToNull(request.getRemarks()));
        approval.setUpdatedBy(actor);
        approval.setUpdatedAt(LocalDateTime.now());

        return toResponse(repository.save(approval));
    }

    @Override
    @Transactional(readOnly = true)
    public VendorMaterialApprovalResponse getApproval(UUID id) {
        return toResponse(getActiveApproval(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VendorMaterialApprovalResponse> getApprovals(
            UUID vendorId,
            UUID vendorBusinessUnitId,
            UUID supplierId,
            UUID materialId,
            VendorMaterialApprovalStatus status
    ) {
        Specification<VendorMaterialApproval> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.isTrue(root.get("isActive")));
            if (vendorId != null) {
                predicates.add(criteriaBuilder.equal(root.get("vendorId"), vendorId));
            }
            if (vendorBusinessUnitId != null) {
                predicates.add(criteriaBuilder.equal(root.get("vendorBusinessUnitId"), vendorBusinessUnitId));
            }
            if (supplierId != null) {
                predicates.add(criteriaBuilder.equal(root.get("supplierId"), supplierId));
            }
            if (materialId != null) {
                predicates.add(criteriaBuilder.equal(root.get("materialId"), materialId));
            }
            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }
            query.orderBy(criteriaBuilder.desc(root.get("createdAt")));
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };

        return repository.findAll(specification).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void deactivateApproval(UUID id) {
        String actor = authenticatedActorService.currentActor();
        VendorMaterialApproval approval = getActiveApproval(id);
        approval.setIsActive(false);
        approval.setUpdatedBy(actor);
        approval.setUpdatedAt(LocalDateTime.now());
        repository.save(approval);
    }

    private VendorMaterialApproval getActiveApproval(UUID id) {
        VendorMaterialApproval approval = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor material approval not found with id: " + id));
        if (!Boolean.TRUE.equals(approval.getIsActive())) {
            throw new ResourceNotFoundException("Vendor material approval not found with id: " + id);
        }
        return approval;
    }

    private void validateReferences(VendorMaterialApprovalRequest request) {
        vendorRepository.findById(request.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + request.getVendorId()));
        var businessUnit = vendorBusinessUnitRepository.findById(request.getVendorBusinessUnitId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor business unit not found with id: " + request.getVendorBusinessUnitId()));
        if (!businessUnit.getVendorId().equals(request.getVendorId())) {
            throw new BusinessConflictException("Vendor business unit does not belong to the provided vendor");
        }
        supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + request.getSupplierId()));
        materialRepository.findById(request.getMaterialId())
                .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + request.getMaterialId()));
    }

    private String normalizeApprover(String requestedApprover, String actor) {
        if (requestedApprover == null || requestedApprover.trim().isEmpty()) {
            return actor;
        }
        return requestedApprover.trim();
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private VendorMaterialApprovalResponse toResponse(VendorMaterialApproval approval) {
        return VendorMaterialApprovalResponse.builder()
                .id(approval.getId())
                .vendorId(approval.getVendorId())
                .vendorBusinessUnitId(approval.getVendorBusinessUnitId())
                .supplierId(approval.getSupplierId())
                .materialId(approval.getMaterialId())
                .status(approval.getStatus())
                .approvalBasis(approval.getApprovalBasis())
                .qualificationDate(approval.getQualificationDate())
                .nextRequalificationDate(approval.getNextRequalificationDate())
                .approvedBy(approval.getApprovedBy())
                .remarks(approval.getRemarks())
                .isActive(approval.getIsActive())
                .createdBy(approval.getCreatedBy())
                .createdAt(approval.getCreatedAt())
                .updatedBy(approval.getUpdatedBy())
                .updatedAt(approval.getUpdatedAt())
                .build();
    }
}
