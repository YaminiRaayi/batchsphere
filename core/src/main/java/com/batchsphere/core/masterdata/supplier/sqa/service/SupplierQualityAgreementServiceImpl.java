package com.batchsphere.core.masterdata.supplier.sqa.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierResponse;
import com.batchsphere.core.masterdata.supplier.entity.Supplier;
import com.batchsphere.core.masterdata.supplier.entity.SupplierQualificationStatus;
import com.batchsphere.core.masterdata.supplier.repository.SupplierRepository;
import com.batchsphere.core.masterdata.supplier.sqa.dto.SupplierQualityAgreementDTO.*;
import com.batchsphere.core.masterdata.supplier.sqa.entity.SupplierQualityAgreement;
import com.batchsphere.core.masterdata.supplier.sqa.entity.SupplierQualityAgreementStatus;
import com.batchsphere.core.masterdata.supplier.sqa.repository.SupplierQualityAgreementRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitRepository;
import com.batchsphere.core.qms.document.repository.ControlledDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierQualityAgreementServiceImpl implements SupplierQualityAgreementService {

    private final SupplierQualityAgreementRepository sqaRepository;
    private final SupplierRepository supplierRepository;
    private final VendorBusinessUnitRepository vendorBusinessUnitRepository;
    private final ControlledDocumentRepository controlledDocumentRepository;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;

    @Override
    @Transactional
    public Response create(Request request) {
        String actor = authenticatedActorService.currentActor();
        validateReferences(request);

        SupplierQualityAgreement agreement = SupplierQualityAgreement.builder()
                .sqaNumber(nextSqaNumber())
                .supplierId(request.getSupplierId())
                .vendorBusinessUnitId(request.getVendorBusinessUnitId())
                .title(request.getTitle())
                .effectiveDate(request.getEffectiveDate())
                .expiryDate(request.getExpiryDate())
                .status(request.getStatus() == null ? SupplierQualityAgreementStatus.DRAFT : request.getStatus())
                .sopDocumentId(request.getSopDocumentId())
                .gmpResponsibilities(request.getGmpResponsibilities())
                .changeNotificationRequirements(request.getChangeNotificationRequirements())
                .auditRights(request.getAuditRights())
                .testingResponsibilities(request.getTestingResponsibilities())
                .retentionSampleRequirements(request.getRetentionSampleRequirements())
                .agreedAcceptanceCriteria(request.getAgreedAcceptanceCriteria())
                .ourSignatory(request.getOurSignatory())
                .ourSignatoryDate(request.getOurSignatoryDate())
                .supplierSignatory(request.getSupplierSignatory())
                .supplierSignatoryDate(request.getSupplierSignatoryDate())
                .terminatedReason(request.getTerminatedReason())
                .createdBy(actor)
                .build();

        SupplierQualityAgreement saved = sqaRepository.save(agreement);
        auditEventService.record("SUPPLIER_QUALITY_AGREEMENT", saved.getId(), AuditEventType.CREATE, "status",
                null, saved.getStatus().name(), "Supplier quality agreement created", actor, "SQA");
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Response get(UUID id) {
        return toResponse(findActive(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Response> list(UUID supplierId, SupplierQualityAgreementStatus status, Pageable pageable) {
        Page<SupplierQualityAgreement> agreements;
        if (supplierId != null && status != null) {
            agreements = sqaRepository.findBySupplierIdAndStatusAndIsActiveTrue(supplierId, status, pageable);
        } else if (supplierId != null) {
            agreements = sqaRepository.findBySupplierIdAndIsActiveTrue(supplierId, pageable);
        } else if (status != null) {
            agreements = sqaRepository.findByStatusAndIsActiveTrue(status, pageable);
        } else {
            agreements = sqaRepository.findByIsActiveTrue(pageable);
        }
        return agreements.map(this::toResponse);
    }

    @Override
    @Transactional
    public Response update(UUID id, Request request) {
        String actor = authenticatedActorService.currentActor();
        validateReferences(request);

        SupplierQualityAgreement agreement = findActive(id);
        SupplierQualityAgreementStatus oldStatus = agreement.getStatus();
        agreement.setSupplierId(request.getSupplierId());
        agreement.setVendorBusinessUnitId(request.getVendorBusinessUnitId());
        agreement.setTitle(request.getTitle());
        agreement.setEffectiveDate(request.getEffectiveDate());
        agreement.setExpiryDate(request.getExpiryDate());
        agreement.setStatus(request.getStatus() == null ? agreement.getStatus() : request.getStatus());
        agreement.setSopDocumentId(request.getSopDocumentId());
        agreement.setGmpResponsibilities(request.getGmpResponsibilities());
        agreement.setChangeNotificationRequirements(request.getChangeNotificationRequirements());
        agreement.setAuditRights(request.getAuditRights());
        agreement.setTestingResponsibilities(request.getTestingResponsibilities());
        agreement.setRetentionSampleRequirements(request.getRetentionSampleRequirements());
        agreement.setAgreedAcceptanceCriteria(request.getAgreedAcceptanceCriteria());
        agreement.setOurSignatory(request.getOurSignatory());
        agreement.setOurSignatoryDate(request.getOurSignatoryDate());
        agreement.setSupplierSignatory(request.getSupplierSignatory());
        agreement.setSupplierSignatoryDate(request.getSupplierSignatoryDate());
        agreement.setTerminatedReason(request.getTerminatedReason());
        agreement.setUpdatedBy(actor);
        agreement.setUpdatedAt(LocalDateTime.now());

        SupplierQualityAgreement saved = sqaRepository.save(agreement);
        auditEventService.record("SUPPLIER_QUALITY_AGREEMENT", saved.getId(), AuditEventType.UPDATE, "agreementDetails",
                null, saved.getTitle(), "Supplier quality agreement updated", actor, "SQA");
        if (oldStatus != saved.getStatus()) {
            auditEventService.record("SUPPLIER_QUALITY_AGREEMENT", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                    oldStatus.name(), saved.getStatus().name(), "Supplier quality agreement status updated", actor, "SQA");
        }
        return toResponse(saved);
    }

    @Override
    @Transactional
    public Response updateStatus(UUID id, StatusRequest request) {
        if (request.getStatus() == null) {
            throw new BusinessConflictException("SQA status is required");
        }
        if (request.getStatus() == SupplierQualityAgreementStatus.TERMINATED
                && (request.getTerminatedReason() == null || request.getTerminatedReason().isBlank())) {
            throw new BusinessConflictException("Termination reason is required for terminated SQAs");
        }

        String actor = authenticatedActorService.currentActor();
        SupplierQualityAgreement agreement = findActive(id);
        SupplierQualityAgreementStatus oldStatus = agreement.getStatus();
        agreement.setStatus(request.getStatus());
        agreement.setTerminatedReason(request.getStatus() == SupplierQualityAgreementStatus.TERMINATED
                ? request.getTerminatedReason()
                : agreement.getTerminatedReason());
        agreement.setUpdatedBy(actor);
        agreement.setUpdatedAt(LocalDateTime.now());

        SupplierQualityAgreement saved = sqaRepository.save(agreement);
        auditEventService.record("SUPPLIER_QUALITY_AGREEMENT", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                oldStatus.name(), saved.getStatus().name(), request.getTerminatedReason(), actor, "SQA");
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Response> findExpiringSoon(int days) {
        LocalDate cutoff = LocalDate.now().plusDays(Math.max(days, 0));
        return sqaRepository.findByStatusAndExpiryDateLessThanEqualAndIsActiveTrue(SupplierQualityAgreementStatus.ACTIVE, cutoff)
                .stream()
                .filter(agreement -> agreement.getExpiryDate() != null && !agreement.getExpiryDate().isBefore(LocalDate.now()))
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Response> findBySupplier(UUID supplierId) {
        ensureSupplierExists(supplierId);
        return sqaRepository.findBySupplierIdAndIsActiveTrueOrderByCreatedAtDesc(supplierId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupplierResponse> findSuppliersWithoutSqa() {
        return supplierRepository.findByQualificationStatusAndIsActiveTrue(SupplierQualificationStatus.QUALIFIED)
                .stream()
                .filter(supplier -> !sqaRepository.existsBySupplierIdAndStatusAndIsActiveTrue(
                        supplier.getId(),
                        SupplierQualityAgreementStatus.ACTIVE))
                .map(this::toSupplierResponse)
                .toList();
    }

    private SupplierQualityAgreement findActive(UUID id) {
        return sqaRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier quality agreement not found: " + id));
    }

    private void validateReferences(Request request) {
        if (request.getSupplierId() != null) {
            ensureSupplierExists(request.getSupplierId());
        }
        if (request.getVendorBusinessUnitId() != null) {
            VendorBusinessUnit businessUnit = vendorBusinessUnitRepository.findById(request.getVendorBusinessUnitId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vendor business unit not found: " + request.getVendorBusinessUnitId()));
            if (!Boolean.TRUE.equals(businessUnit.getIsActive())) {
                throw new ResourceNotFoundException("Vendor business unit not found: " + request.getVendorBusinessUnitId());
            }
        }
        if (request.getSopDocumentId() != null && controlledDocumentRepository.findByIdAndIsActiveTrue(request.getSopDocumentId()).isEmpty()) {
            throw new ResourceNotFoundException("Controlled document not found: " + request.getSopDocumentId());
        }
    }

    private Supplier ensureSupplierExists(UUID supplierId) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + supplierId));
        if (!Boolean.TRUE.equals(supplier.getIsActive())) {
            throw new ResourceNotFoundException("Supplier not found: " + supplierId);
        }
        return supplier;
    }

    private String nextSqaNumber() {
        String year = String.valueOf(LocalDate.now().getYear());
        for (int attempt = 0; attempt < 20; attempt++) {
            String candidate = "SQA-" + year + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            if (!sqaRepository.existsBySqaNumber(candidate)) {
                return candidate;
            }
        }
        throw new BusinessConflictException("Unable to generate unique SQA number");
    }

    private Response toResponse(SupplierQualityAgreement agreement) {
        String supplierName = agreement.getSupplierId() == null
                ? null
                : supplierRepository.findById(agreement.getSupplierId())
                .map(Supplier::getSupplierName)
                .orElse(null);
        String vendorBusinessUnitName = agreement.getVendorBusinessUnitId() == null
                ? null
                : vendorBusinessUnitRepository.findById(agreement.getVendorBusinessUnitId())
                .map(VendorBusinessUnit::getUnitName)
                .orElse(null);
        Long daysUntilExpiry = agreement.getExpiryDate() == null
                ? null
                : ChronoUnit.DAYS.between(LocalDate.now(), agreement.getExpiryDate());

        return Response.builder()
                .id(agreement.getId())
                .sqaNumber(agreement.getSqaNumber())
                .supplierId(agreement.getSupplierId())
                .supplierName(supplierName)
                .vendorBusinessUnitId(agreement.getVendorBusinessUnitId())
                .vendorBusinessUnitName(vendorBusinessUnitName)
                .title(agreement.getTitle())
                .effectiveDate(agreement.getEffectiveDate())
                .expiryDate(agreement.getExpiryDate())
                .status(agreement.getStatus())
                .sopDocumentId(agreement.getSopDocumentId())
                .gmpResponsibilities(agreement.getGmpResponsibilities())
                .changeNotificationRequirements(agreement.getChangeNotificationRequirements())
                .auditRights(agreement.getAuditRights())
                .testingResponsibilities(agreement.getTestingResponsibilities())
                .retentionSampleRequirements(agreement.getRetentionSampleRequirements())
                .agreedAcceptanceCriteria(agreement.getAgreedAcceptanceCriteria())
                .ourSignatory(agreement.getOurSignatory())
                .ourSignatoryDate(agreement.getOurSignatoryDate())
                .supplierSignatory(agreement.getSupplierSignatory())
                .supplierSignatoryDate(agreement.getSupplierSignatoryDate())
                .terminatedReason(agreement.getTerminatedReason())
                .daysUntilExpiry(daysUntilExpiry)
                .expiringSoon(daysUntilExpiry != null && daysUntilExpiry >= 0 && daysUntilExpiry <= 60)
                .createdBy(agreement.getCreatedBy())
                .createdAt(agreement.getCreatedAt())
                .updatedBy(agreement.getUpdatedBy())
                .updatedAt(agreement.getUpdatedAt())
                .build();
    }

    private SupplierResponse toSupplierResponse(Supplier supplier) {
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
