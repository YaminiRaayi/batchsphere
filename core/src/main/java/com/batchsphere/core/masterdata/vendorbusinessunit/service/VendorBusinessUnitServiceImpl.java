package com.batchsphere.core.masterdata.vendorbusinessunit.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.CreateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.UpdateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorAuditRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorAuditResponse;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorDocumentResponse;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.QualificationStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAudit;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditOutcome;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorDocument;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorDocumentStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorDocumentType;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorAuditRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitDocumentRepository;
import com.batchsphere.core.storage.LocalStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VendorBusinessUnitServiceImpl implements VendorBusinessUnitService {

    private final VendorBusinessUnitRepository vendorBusinessUnitRepository;
    private final VendorRepository vendorRepository;
    private final VendorBusinessUnitDocumentRepository vendorDocumentRepository;
    private final VendorAuditRepository vendorAuditRepository;
    private final LocalStorageService localStorageService;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public VendorBusinessUnit createVendorBusinessUnit(UUID vendorId, CreateVendorBusinessUnitRequest request) {
        String actor = authenticatedActorService.currentActor();
        validateVendorExists(vendorId);

        VendorBusinessUnit vbu = VendorBusinessUnit.builder()
                .id(UUID.randomUUID())
                .vendorId(vendorId)
                .unitName(request.getUnitName())
                .buCode(request.getBuCode())
                .siteType(request.getSiteType())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .pincode(request.getPincode())
                .siteContactPerson(request.getSiteContactPerson())
                .siteEmail(request.getSiteEmail())
                .sitePhone(request.getSitePhone())
                .drugLicenseNumber(request.getDrugLicenseNumber())
                .drugLicenseExpiry(request.getDrugLicenseExpiry())
                .gmpCertBody(request.getGmpCertBody())
                .gmpCertNumber(request.getGmpCertNumber())
                .gmpCertExpiry(request.getGmpCertExpiry())
                .isWhoGmpCertified(Boolean.TRUE.equals(request.getIsWhoGmpCertified()))
                .isUsfda(Boolean.TRUE.equals(request.getIsUsfda()))
                .isEuGmp(Boolean.TRUE.equals(request.getIsEuGmp()))
                .qualificationStatus(QualificationStatus.NOT_STARTED)
                .qualifiedDate(request.getQualifiedDate())
                .nextRequalificationDue(request.getNextRequalificationDue())
                .lastAuditDate(request.getLastAuditDate())
                .qaRating(request.getQaRating())
                .deliveryScore(request.getDeliveryScore())
                .rejectionRate(request.getRejectionRate())
                .openCapaCount(defaultInteger(request.getOpenCapaCount()))
                .isApproved(false)
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        return vendorBusinessUnitRepository.save(vbu);
    }

    @Override
    public VendorBusinessUnit getVendorBusinessUnitById(UUID id) {
        return vendorBusinessUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor business unit not found with id: " + id));
    }

    @Override
    public Page<VendorBusinessUnit> getAllVendorBusinessUnits(UUID vendorId, Pageable pageable) {
        if (vendorId != null) {
            return vendorBusinessUnitRepository.findByVendorIdAndIsActiveTrue(vendorId, pageable);
        }
        return vendorBusinessUnitRepository.findByIsActiveTrue(pageable);
    }

    @Override
    public VendorBusinessUnit updateVendorBusinessUnit(UUID vendorId, UUID id, UpdateVendorBusinessUnitRequest request) {
        String actor = authenticatedActorService.currentActor();
        VendorBusinessUnit existing = getVendorBusinessUnitById(id);
        validateVendorExists(vendorId);
        if (!existing.getVendorId().equals(vendorId)) {
            throw new BusinessConflictException("Business unit does not belong to vendor: " + vendorId);
        }

        existing.setUnitName(request.getUnitName());
        existing.setBuCode(request.getBuCode());
        existing.setSiteType(request.getSiteType());
        existing.setAddress(request.getAddress());
        existing.setCity(request.getCity());
        existing.setState(request.getState());
        existing.setCountry(request.getCountry());
        existing.setPincode(request.getPincode());
        existing.setSiteContactPerson(request.getSiteContactPerson());
        existing.setSiteEmail(request.getSiteEmail());
        existing.setSitePhone(request.getSitePhone());
        existing.setDrugLicenseNumber(request.getDrugLicenseNumber());
        existing.setDrugLicenseExpiry(request.getDrugLicenseExpiry());
        existing.setGmpCertBody(request.getGmpCertBody());
        existing.setGmpCertNumber(request.getGmpCertNumber());
        existing.setGmpCertExpiry(request.getGmpCertExpiry());
        existing.setIsWhoGmpCertified(Boolean.TRUE.equals(request.getIsWhoGmpCertified()));
        existing.setIsUsfda(Boolean.TRUE.equals(request.getIsUsfda()));
        existing.setIsEuGmp(Boolean.TRUE.equals(request.getIsEuGmp()));
        if (request.getQualificationStatus() != null) {
            existing.setQualificationStatus(request.getQualificationStatus());
            if (request.getQualificationStatus() == QualificationStatus.QUALIFIED) {
                existing.setIsApproved(true);
            } else if (request.getQualificationStatus() == QualificationStatus.SUSPENDED
                    || request.getQualificationStatus() == QualificationStatus.DISQUALIFIED) {
                existing.setIsApproved(false);
            }
        }
        existing.setQualifiedDate(request.getQualifiedDate());
        existing.setNextRequalificationDue(request.getNextRequalificationDue());
        existing.setLastAuditDate(request.getLastAuditDate());
        existing.setQaRating(request.getQaRating());
        existing.setDeliveryScore(request.getDeliveryScore());
        existing.setRejectionRate(request.getRejectionRate());
        existing.setOpenCapaCount(request.getOpenCapaCount() == null ? 0 : request.getOpenCapaCount());
        existing.setUpdatedBy(actor);
        existing.setUpdatedAt(LocalDateTime.now());

        return vendorBusinessUnitRepository.save(existing);
    }

    @Override
    public void deactivateVendorBusinessUnit(UUID id) {
        String actor = authenticatedActorService.currentActor();
        VendorBusinessUnit existing = getActiveBusinessUnit(id);
        existing.setIsActive(false);
        existing.setUpdatedBy(actor);
        existing.setUpdatedAt(LocalDateTime.now());
        vendorBusinessUnitRepository.save(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VendorDocumentResponse> getVendorDocuments(UUID businessUnitId) {
        getActiveBusinessUnit(businessUnitId);
        return vendorDocumentRepository.findByBuIdAndIsActiveTrueOrderByUploadedAtDesc(businessUnitId)
                .stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    @Override
    @Transactional
    public VendorDocumentResponse uploadVendorDocument(
            UUID businessUnitId,
            String documentTitle,
            String documentType,
            LocalDate expiryDate,
            MultipartFile file
    ) {
        String actor = authenticatedActorService.currentActor();
        VendorBusinessUnit businessUnit = getActiveBusinessUnit(businessUnitId);
        String normalizedTitle = normalizeRequired(documentTitle, "Document title is required");
        VendorDocumentType resolvedType = parseDocumentType(documentType);
        String storagePath = localStorageService.store(
                "vendor-business-unit",
                businessUnit.getId() + "/documents",
                file
        );

        VendorDocument document = VendorDocument.builder()
                .id(UUID.randomUUID())
                .buId(businessUnitId)
                .documentType(resolvedType)
                .documentTitle(normalizedTitle)
                .fileName(file.getOriginalFilename() == null ? "document" : file.getOriginalFilename())
                .storagePath(storagePath)
                .uploadedAt(LocalDateTime.now())
                .expiryDate(expiryDate)
                .status(resolveDocumentStatus(expiryDate))
                .uploadedBy(actor)
                .isActive(true)
                .build();

        return toDocumentResponse(vendorDocumentRepository.save(document));
    }

    @Override
    @Transactional
    public void deleteVendorDocument(UUID businessUnitId, UUID documentId) {
        getActiveBusinessUnit(businessUnitId);
        VendorDocument document = vendorDocumentRepository.findByIdAndBuIdAndIsActiveTrue(documentId, businessUnitId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor document not found with id: " + documentId));
        document.setIsActive(false);
        vendorDocumentRepository.save(document);
    }

    @Override
    @Transactional(readOnly = true)
    public Resource loadVendorDocumentFile(UUID businessUnitId, UUID documentId) {
        getActiveBusinessUnit(businessUnitId);
        VendorDocument document = vendorDocumentRepository.findByIdAndBuIdAndIsActiveTrue(documentId, businessUnitId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor document not found with id: " + documentId));
        return localStorageService.loadAsResource(document.getStoragePath());
    }

    @Override
    @Transactional(readOnly = true)
    public List<VendorAuditResponse> getVendorAudits(UUID businessUnitId) {
        getActiveBusinessUnit(businessUnitId);
        return vendorAuditRepository.findByBuIdAndIsActiveTrueOrderByScheduledDateDescCreatedAtDesc(businessUnitId)
                .stream()
                .map(this::toAuditResponse)
                .toList();
    }

    @Override
    @Transactional
    public VendorAuditResponse createVendorAudit(UUID businessUnitId, VendorAuditRequest request) {
        String actor = authenticatedActorService.currentActor();
        getActiveBusinessUnit(businessUnitId);

        VendorAudit audit = VendorAudit.builder()
                .id(UUID.randomUUID())
                .buId(businessUnitId)
                .auditType(request.getAuditType())
                .scheduledDate(request.getScheduledDate())
                .completedDate(request.getCompletedDate())
                .auditedBy(normalizeRequired(request.getAuditedBy(), "Audited by is required"))
                .status(request.getStatus() == null ? VendorAuditStatus.SCHEDULED : request.getStatus())
                .outcome(request.getOutcome())
                .observationCount(defaultInteger(request.getObservationCount()))
                .criticalObservationCount(defaultInteger(request.getCriticalObservationCount()))
                .notes(blankToNull(request.getNotes()))
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .build();

        VendorAudit savedAudit = vendorAuditRepository.save(audit);
        syncBusinessUnitAuditState(savedAudit, actor);
        return toAuditResponse(savedAudit);
    }

    @Override
    @Transactional
    public VendorAuditResponse updateVendorAudit(UUID businessUnitId, UUID auditId, VendorAuditRequest request) {
        String actor = authenticatedActorService.currentActor();
        VendorAudit audit = vendorAuditRepository.findByIdAndBuIdAndIsActiveTrue(auditId, businessUnitId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor audit not found with id: " + auditId));

        audit.setAuditType(request.getAuditType());
        audit.setScheduledDate(request.getScheduledDate());
        audit.setCompletedDate(request.getCompletedDate());
        audit.setAuditedBy(normalizeRequired(request.getAuditedBy(), "Audited by is required"));
        audit.setStatus(request.getStatus() == null ? audit.getStatus() : request.getStatus());
        audit.setOutcome(request.getOutcome());
        audit.setObservationCount(defaultInteger(request.getObservationCount()));
        audit.setCriticalObservationCount(defaultInteger(request.getCriticalObservationCount()));
        audit.setNotes(blankToNull(request.getNotes()));
        audit.setUpdatedBy(actor);
        audit.setUpdatedAt(LocalDateTime.now());

        VendorAudit savedAudit = vendorAuditRepository.save(audit);
        syncBusinessUnitAuditState(savedAudit, actor);
        return toAuditResponse(savedAudit);
    }

    private void validateVendorExists(UUID vendorId) {
        if (!vendorRepository.existsById(vendorId)) {
            throw new ResourceNotFoundException("Vendor not found with id: " + vendorId);
        }
    }

    private VendorBusinessUnit getActiveBusinessUnit(UUID id) {
        VendorBusinessUnit businessUnit = vendorBusinessUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor business unit not found with id: " + id));
        if (!Boolean.TRUE.equals(businessUnit.getIsActive())) {
            throw new ResourceNotFoundException("Vendor business unit not found with id: " + id);
        }
        return businessUnit;
    }

    private VendorDocumentResponse toDocumentResponse(VendorDocument document) {
        return VendorDocumentResponse.builder()
                .id(document.getId())
                .buId(document.getBuId())
                .documentType(document.getDocumentType())
                .documentTitle(document.getDocumentTitle())
                .fileName(document.getFileName())
                .storagePath(document.getStoragePath())
                .uploadedAt(document.getUploadedAt())
                .expiryDate(document.getExpiryDate())
                .status(resolveDocumentStatus(document.getExpiryDate()))
                .uploadedBy(document.getUploadedBy())
                .build();
    }

    private VendorAuditResponse toAuditResponse(VendorAudit audit) {
        return VendorAuditResponse.builder()
                .id(audit.getId())
                .buId(audit.getBuId())
                .auditType(audit.getAuditType())
                .scheduledDate(audit.getScheduledDate())
                .completedDate(audit.getCompletedDate())
                .auditedBy(audit.getAuditedBy())
                .status(audit.getStatus())
                .outcome(audit.getOutcome())
                .observationCount(audit.getObservationCount())
                .criticalObservationCount(audit.getCriticalObservationCount())
                .notes(audit.getNotes())
                .createdAt(audit.getCreatedAt())
                .updatedBy(audit.getUpdatedBy())
                .updatedAt(audit.getUpdatedAt())
                .build();
    }

    private VendorDocumentType parseDocumentType(String rawType) {
        try {
            return VendorDocumentType.valueOf(normalizeRequired(rawType, "Document type is required").toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BusinessConflictException("Unsupported document type: " + rawType);
        }
    }

    private VendorDocumentStatus resolveDocumentStatus(LocalDate expiryDate) {
        if (expiryDate == null) {
            return VendorDocumentStatus.VALID;
        }
        LocalDate today = LocalDate.now();
        if (expiryDate.isBefore(today)) {
            return VendorDocumentStatus.EXPIRED;
        }
        if (!expiryDate.isAfter(today.plusDays(60))) {
            return VendorDocumentStatus.EXPIRING_SOON;
        }
        return VendorDocumentStatus.VALID;
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new BusinessConflictException(message);
        }
        return value.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private Integer defaultInteger(Integer value) {
        return value == null ? 0 : value;
    }

    private void syncBusinessUnitAuditState(VendorAudit audit, String actor) {
        VendorBusinessUnit businessUnit = getActiveBusinessUnit(audit.getBuId());
        businessUnit.setUpdatedBy(actor);
        businessUnit.setUpdatedAt(LocalDateTime.now());

        if (audit.getStatus() == VendorAuditStatus.SCHEDULED) {
            businessUnit.setQualificationStatus(QualificationStatus.AUDIT_SCHEDULED);
        } else if (audit.getStatus() == VendorAuditStatus.IN_PROGRESS) {
            businessUnit.setQualificationStatus(QualificationStatus.AUDIT_IN_PROGRESS);
        } else if (audit.getStatus() == VendorAuditStatus.COMPLETED) {
            LocalDate completedDate = audit.getCompletedDate() == null ? audit.getScheduledDate() : audit.getCompletedDate();
            businessUnit.setLastAuditDate(completedDate);
            if (audit.getOutcome() == VendorAuditOutcome.APPROVED
                    || audit.getOutcome() == VendorAuditOutcome.APPROVED_WITH_OBSERVATIONS) {
                businessUnit.setQualifiedDate(completedDate);
                businessUnit.setNextRequalificationDue(completedDate.plusYears(2));
                businessUnit.setQualificationStatus(QualificationStatus.QUALIFIED);
                businessUnit.setIsApproved(true);
            } else if (audit.getOutcome() == VendorAuditOutcome.PENDING_CAPA) {
                businessUnit.setQualificationStatus(QualificationStatus.CAPA_PENDING);
                businessUnit.setIsApproved(false);
                businessUnit.setOpenCapaCount(defaultInteger(audit.getObservationCount()));
            } else if (audit.getOutcome() == VendorAuditOutcome.REJECTED) {
                businessUnit.setQualificationStatus(QualificationStatus.DISQUALIFIED);
                businessUnit.setIsApproved(false);
            }
        }

        vendorBusinessUnitRepository.save(businessUnit);
    }
}
