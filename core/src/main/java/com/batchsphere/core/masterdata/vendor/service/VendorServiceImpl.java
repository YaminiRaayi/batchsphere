package com.batchsphere.core.masterdata.vendor.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.vendor.dto.VendorApprovalRequest;
import com.batchsphere.core.masterdata.vendor.dto.VendorDocumentResponse;
import com.batchsphere.core.masterdata.vendor.dto.VendorRequest;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import com.batchsphere.core.masterdata.vendor.entity.VendorDocument;
import com.batchsphere.core.masterdata.vendor.repository.VendorCorporateDocumentRepository;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorDocumentStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorDocumentType;
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
public class VendorServiceImpl implements VendorService {

    private final VendorRepository vendorRepository;
    private final VendorCorporateDocumentRepository vendorDocumentRepository;
    private final LocalStorageService localStorageService;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public Vendor createVendor(VendorRequest request) {
        String actor = authenticatedActorService.currentActor();
        if (vendorRepository.existsByVendorCode(request.getVendorCode())) {
            throw new DuplicateResourceException("Vendor code already exists: " + request.getVendorCode());
        }

        Vendor vendor = Vendor.builder()
                .id(UUID.randomUUID())
                .vendorCode(request.getVendorCode())
                .vendorName(request.getVendorName())
                .contactPerson(request.getContactPerson())
                .email(request.getEmail())
                .phone(request.getPhone())
                .vendorCategory(request.getVendorCategory())
                .corporateAddress(request.getCorporateAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .pincode(request.getPincode())
                .gstin(request.getGstin())
                .pan(request.getPan())
                .website(request.getWebsite())
                .paymentTermsDays(request.getPaymentTermsDays())
                .approvedSince(request.getApprovedSince())
                .lastAuditDate(request.getLastAuditDate())
                .nextAuditDue(request.getNextAuditDue())
                .qaRating(request.getQaRating())
                .deliveryScore(request.getDeliveryScore())
                .rejectionRate(request.getRejectionRate())
                .openCapaCount(request.getOpenCapaCount())
                .isApproved(false)
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        return vendorRepository.save(vendor);
    }

    @Override
    public Vendor getVendorById(UUID id) {
        return vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));
    }

    @Override
    public Page<Vendor> getAllVendors(Pageable pageable) {
        return vendorRepository.findAll(pageable);
    }

    @Override
    public Vendor updateVendor(UUID id, VendorRequest request) {
        String actor = authenticatedActorService.currentActor();
        Vendor vendor = getVendor(id);

        if (!vendor.getVendorCode().equals(request.getVendorCode())
                && vendorRepository.existsByVendorCode(request.getVendorCode())) {
            throw new DuplicateResourceException("Vendor code already exists: " + request.getVendorCode());
        }

        vendor.setVendorCode(request.getVendorCode());
        vendor.setVendorName(request.getVendorName());
        vendor.setContactPerson(request.getContactPerson());
        vendor.setEmail(request.getEmail());
        vendor.setPhone(request.getPhone());
        vendor.setVendorCategory(request.getVendorCategory());
        vendor.setCorporateAddress(request.getCorporateAddress());
        vendor.setCity(request.getCity());
        vendor.setState(request.getState());
        vendor.setCountry(request.getCountry());
        vendor.setPincode(request.getPincode());
        vendor.setGstin(request.getGstin());
        vendor.setPan(request.getPan());
        vendor.setWebsite(request.getWebsite());
        vendor.setPaymentTermsDays(request.getPaymentTermsDays());
        vendor.setLastAuditDate(request.getLastAuditDate());
        vendor.setNextAuditDue(request.getNextAuditDue());
        vendor.setQaRating(request.getQaRating());
        vendor.setDeliveryScore(request.getDeliveryScore());
        vendor.setRejectionRate(request.getRejectionRate());
        vendor.setOpenCapaCount(request.getOpenCapaCount());
        vendor.setUpdatedBy(actor);
        vendor.setUpdatedAt(LocalDateTime.now());

        return vendorRepository.save(vendor);
    }

    @Override
    public Vendor updateVendorApproval(UUID id, VendorApprovalRequest request) {
        String actor = authenticatedActorService.currentActor();
        Vendor vendor = getVendor(id);

        vendor.setIsApproved(request.getApproved());
        vendor.setApprovedSince(Boolean.TRUE.equals(request.getApproved())
                ? (request.getApprovedSince() == null ? LocalDate.now() : request.getApprovedSince())
                : null);
        vendor.setUpdatedBy(actor);
        vendor.setUpdatedAt(LocalDateTime.now());

        return vendorRepository.save(vendor);
    }

    @Override
    public void deactivateVendor(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Vendor vendor = getVendor(id);

        vendor.setIsActive(false);
        vendor.setUpdatedBy(actor);
        vendor.setUpdatedAt(LocalDateTime.now());

        vendorRepository.save(vendor);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VendorDocumentResponse> getVendorDocuments(UUID vendorId) {
        getActiveVendor(vendorId);
        return vendorDocumentRepository.findByVendorIdAndIsActiveTrueOrderByUploadedAtDesc(vendorId)
                .stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    @Override
    @Transactional
    public VendorDocumentResponse uploadVendorDocument(
            UUID vendorId,
            String documentTitle,
            String documentType,
            LocalDate expiryDate,
            MultipartFile file
    ) {
        String actor = authenticatedActorService.currentActor();
        Vendor vendor = getActiveVendor(vendorId);
        String normalizedTitle = normalizeRequired(documentTitle, "Document title is required");
        VendorDocumentType resolvedType = parseDocumentType(documentType);
        String storagePath = localStorageService.store("vendor", vendor.getId() + "/documents", file);

        VendorDocument document = VendorDocument.builder()
                .id(UUID.randomUUID())
                .vendorId(vendorId)
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
    public void deleteVendorDocument(UUID vendorId, UUID documentId) {
        getActiveVendor(vendorId);
        VendorDocument document = vendorDocumentRepository.findByIdAndVendorIdAndIsActiveTrue(documentId, vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor document not found with id: " + documentId));
        document.setIsActive(false);
        vendorDocumentRepository.save(document);
    }

    @Override
    @Transactional(readOnly = true)
    public Resource loadVendorDocumentFile(UUID vendorId, UUID documentId) {
        getActiveVendor(vendorId);
        VendorDocument document = vendorDocumentRepository.findByIdAndVendorIdAndIsActiveTrue(documentId, vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor document not found with id: " + documentId));
        return localStorageService.loadAsResource(document.getStoragePath());
    }

    private Vendor getVendor(UUID id) {
        return vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));
    }

    private Vendor getActiveVendor(UUID id) {
        Vendor vendor = getVendor(id);
        if (!Boolean.TRUE.equals(vendor.getIsActive())) {
            throw new ResourceNotFoundException("Vendor not found with id: " + id);
        }
        return vendor;
    }

    private VendorDocumentResponse toDocumentResponse(VendorDocument document) {
        return VendorDocumentResponse.builder()
                .id(document.getId())
                .vendorId(document.getVendorId())
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
}
