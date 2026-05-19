package com.batchsphere.core.lims.reagent.service;

import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.CreateReagentLotRequest;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.CreateReagentRequest;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.ReagentLotResponse;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.ReagentResponse;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.UpdateReagentLotRequest;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.CreateReferenceStandardLotRequest;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.CreateReferenceStandardRequest;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.ReferenceStandardLotResponse;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.ReferenceStandardResponse;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.UpdateReferenceStandardLotRequest;
import com.batchsphere.core.lims.reagent.entity.LabReagent;
import com.batchsphere.core.lims.reagent.entity.LabReagentLot;
import com.batchsphere.core.lims.reagent.entity.LabReferenceStandard;
import com.batchsphere.core.lims.reagent.entity.LabReferenceStandardLot;
import com.batchsphere.core.lims.reagent.repository.LabReagentLotRepository;
import com.batchsphere.core.lims.reagent.repository.LabReagentRepository;
import com.batchsphere.core.lims.reagent.repository.LabReferenceStandardLotRepository;
import com.batchsphere.core.lims.reagent.repository.LabReferenceStandardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReagentInventoryServiceImpl implements ReagentInventoryService {
    private final LabReagentRepository reagentRepository;
    private final LabReagentLotRepository lotRepository;
    private final LabReferenceStandardRepository standardRepository;
    private final LabReferenceStandardLotRepository standardLotRepository;
    private final AuditEventService auditEventService;

    @Override
    public List<ReagentResponse> listReagents() {
        List<LabReagentLot> lots = lotRepository.findByIsActiveTrueOrderByExpiryDateAsc();
        return reagentRepository.findByIsActiveTrueOrderByReagentNameAsc().stream()
                .map(reagent -> mapReagent(reagent, lots.stream().filter(lot -> lot.getReagentId().equals(reagent.getId())).toList()))
                .toList();
    }

    @Override
    @Transactional
    public ReagentResponse createReagent(CreateReagentRequest request) {
        if (reagentRepository.existsByReagentCodeIgnoreCase(request.getReagentCode())) {
            throw new DuplicateResourceException("Reagent already exists: " + request.getReagentCode());
        }
        LabReagent reagent = LabReagent.builder()
                .id(UUID.randomUUID())
                .reagentCode(required(request.getReagentCode(), "reagentCode"))
                .reagentName(required(request.getReagentName(), "reagentName"))
                .grade(trim(request.getGrade()))
                .manufacturer(trim(request.getManufacturer()))
                .storageCondition(trim(request.getStorageCondition()))
                .createdBy(actor(request.getCreatedBy()))
                .createdAt(LocalDateTime.now())
                .build();
        reagentRepository.save(reagent);
        auditEventService.record("LAB_REAGENT", reagent.getId(), AuditEventType.CREATE, "reagentCode",
                null, reagent.getReagentCode(), "Reagent master created", reagent.getCreatedBy(), "LIMS_REAGENT");
        return mapReagent(reagent, List.of());
    }

    @Override
    public List<ReagentLotResponse> listLots(UUID reagentId) {
        LabReagent reagent = reagent(reagentId);
        return lotRepository.findByReagentIdAndIsActiveTrueOrderByExpiryDateAsc(reagentId).stream()
                .map(lot -> mapLot(lot, reagent))
                .toList();
    }

    @Override
    @Transactional
    public ReagentLotResponse addLot(UUID reagentId, CreateReagentLotRequest request) {
        LabReagent reagent = reagent(reagentId);
        LabReagentLot lot = LabReagentLot.builder()
                .id(UUID.randomUUID())
                .reagentId(reagentId)
                .lotNumber(required(request.getLotNumber(), "lotNumber"))
                .supplier(trim(request.getSupplier()))
                .receivedDate(request.getReceivedDate())
                .expiryDate(request.getExpiryDate())
                .quantityReceived(defaultZero(request.getQuantityReceived()))
                .quantityUsed(defaultZero(request.getQuantityUsed()))
                .unit(trim(request.getUnit()))
                .status(StringUtils.hasText(request.getStatus()) ? request.getStatus().trim().toUpperCase() : "ACTIVE")
                .createdBy(actor(request.getCreatedBy()))
                .createdAt(LocalDateTime.now())
                .build();
        ensureRemainingNonNegative(lot.getQuantityReceived(), lot.getQuantityUsed());
        lotRepository.save(lot);
        auditEventService.record("LAB_REAGENT_LOT", lot.getId(), AuditEventType.CREATE, "status", null, lot.getStatus(),
                "New reagent lot received", lot.getCreatedBy(), "LIMS_REAGENT");
        return mapLot(lot, reagent);
    }

    @Override
    @Transactional
    public ReagentLotResponse updateLot(UUID reagentId, UUID lotId, UpdateReagentLotRequest request) {
        LabReagent reagent = reagent(reagentId);
        LabReagentLot lot = lotRepository.findById(lotId)
                .filter(item -> item.getReagentId().equals(reagentId))
                .orElseThrow(() -> new ResourceNotFoundException("Reagent lot not found: " + lotId));
        BigDecimal oldUsed = lot.getQuantityUsed();
        if (request.getQuantityUsed() != null) {
            ensureRemainingNonNegative(lot.getQuantityReceived(), request.getQuantityUsed());
            lot.setQuantityUsed(request.getQuantityUsed());
        }
        if (StringUtils.hasText(request.getStatus())) {
            lot.setStatus(request.getStatus().trim().toUpperCase());
        }
        lot.setUpdatedBy(actor(request.getUpdatedBy()));
        lot.setUpdatedAt(LocalDateTime.now());
        lotRepository.save(lot);
        auditEventService.record("LAB_REAGENT_LOT", lot.getId(), AuditEventType.UPDATE, "quantityUsed",
                oldUsed != null ? oldUsed.toPlainString() : null, lot.getQuantityUsed().toPlainString(),
                "Reagent lot quantity/status updated", lot.getUpdatedBy(), "LIMS_REAGENT");
        return mapLot(lot, reagent);
    }

    @Override
    public List<ReagentLotResponse> expiringLots(int alertDays) {
        LocalDate today = LocalDate.now();
        LocalDate until = today.plusDays(alertDays);
        return mapLots(lotRepository.findByExpiryDateBetweenAndIsActiveTrueOrderByExpiryDateAsc(today, until));
    }

    @Override
    public List<ReagentLotResponse> availableLots() {
        LocalDate today = LocalDate.now();
        return mapLots(lotRepository.findByIsActiveTrueOrderByExpiryDateAsc()).stream()
                .filter(lot -> "ACTIVE".equals(lot.getStatus()) && lot.getExpiryDate() != null && !lot.getExpiryDate().isBefore(today))
                .filter(lot -> lot.getQuantityRemaining() == null || lot.getQuantityRemaining().compareTo(BigDecimal.ZERO) > 0)
                .toList();
    }

    @Override
    public List<ReferenceStandardResponse> listReferenceStandards() {
        List<LabReferenceStandardLot> lots = standardLotRepository.findAll();
        return standardRepository.findByIsActiveTrueOrderByStandardNameAsc().stream()
                .map(standard -> mapStandard(standard, lots.stream().filter(lot -> lot.getStandardId().equals(standard.getId())).toList()))
                .toList();
    }

    @Override
    @Transactional
    public ReferenceStandardResponse createReferenceStandard(CreateReferenceStandardRequest request) {
        if (standardRepository.existsByStandardCodeIgnoreCase(request.getStandardCode())) {
            throw new DuplicateResourceException("Reference standard already exists: " + request.getStandardCode());
        }
        LabReferenceStandard standard = LabReferenceStandard.builder()
                .id(UUID.randomUUID())
                .standardCode(required(request.getStandardCode(), "standardCode"))
                .standardName(required(request.getStandardName(), "standardName"))
                .pharmacopeia(trim(request.getPharmacopeia()))
                .storageCondition(trim(request.getStorageCondition()))
                .createdBy(actor(request.getCreatedBy()))
                .createdAt(LocalDateTime.now())
                .build();
        standardRepository.save(standard);
        auditEventService.record("LAB_REFERENCE_STANDARD", standard.getId(), AuditEventType.CREATE, "standardCode",
                null, standard.getStandardCode(), "Reference standard master created", standard.getCreatedBy(), "LIMS_REAGENT");
        return mapStandard(standard, List.of());
    }

    @Override
    public List<ReferenceStandardLotResponse> listReferenceStandardLots(UUID standardId) {
        LabReferenceStandard standard = standard(standardId);
        return standardLotRepository.findByStandardIdAndIsActiveTrueOrderByExpiryDateAsc(standardId).stream()
                .map(lot -> mapStandardLot(lot, standard))
                .toList();
    }

    @Override
    @Transactional
    public ReferenceStandardLotResponse addReferenceStandardLot(UUID standardId, CreateReferenceStandardLotRequest request) {
        LabReferenceStandard standard = standard(standardId);
        LabReferenceStandardLot lot = LabReferenceStandardLot.builder()
                .id(UUID.randomUUID())
                .standardId(standardId)
                .lotNumber(required(request.getLotNumber(), "lotNumber"))
                .potency(request.getPotency())
                .receivedDate(request.getReceivedDate())
                .expiryDate(request.getExpiryDate())
                .quantityReceived(defaultZero(request.getQuantityReceived()))
                .quantityUsed(defaultZero(request.getQuantityUsed()))
                .unit(trim(request.getUnit()))
                .status(StringUtils.hasText(request.getStatus()) ? request.getStatus().trim().toUpperCase() : "ACTIVE")
                .createdBy(actor(request.getCreatedBy()))
                .createdAt(LocalDateTime.now())
                .build();
        ensureRemainingNonNegative(lot.getQuantityReceived(), lot.getQuantityUsed());
        standardLotRepository.save(lot);
        auditEventService.record("LAB_REFERENCE_STANDARD_LOT", lot.getId(), AuditEventType.CREATE, "status", null, lot.getStatus(),
                "New reference standard lot received", lot.getCreatedBy(), "LIMS_REAGENT");
        return mapStandardLot(lot, standard);
    }

    @Override
    @Transactional
    public ReferenceStandardLotResponse updateReferenceStandardLot(UUID standardId, UUID lotId, UpdateReferenceStandardLotRequest request) {
        LabReferenceStandard standard = standard(standardId);
        LabReferenceStandardLot lot = standardLotRepository.findById(lotId)
                .filter(item -> item.getStandardId().equals(standardId))
                .orElseThrow(() -> new ResourceNotFoundException("Reference standard lot not found: " + lotId));
        BigDecimal oldUsed = lot.getQuantityUsed();
        if (request.getQuantityUsed() != null) {
            ensureRemainingNonNegative(lot.getQuantityReceived(), request.getQuantityUsed());
            lot.setQuantityUsed(request.getQuantityUsed());
        }
        if (StringUtils.hasText(request.getStatus())) {
            lot.setStatus(request.getStatus().trim().toUpperCase());
        }
        lot.setUpdatedBy(actor(request.getUpdatedBy()));
        lot.setUpdatedAt(LocalDateTime.now());
        standardLotRepository.save(lot);
        auditEventService.record("LAB_REFERENCE_STANDARD_LOT", lot.getId(), AuditEventType.UPDATE, "quantityUsed",
                oldUsed != null ? oldUsed.toPlainString() : null, lot.getQuantityUsed().toPlainString(),
                "Reference standard lot quantity/status updated", lot.getUpdatedBy(), "LIMS_REAGENT");
        return mapStandardLot(lot, standard);
    }

    @Override
    public List<ReferenceStandardLotResponse> expiringReferenceStandardLots(int alertDays) {
        LocalDate today = LocalDate.now();
        return standardLotRepository.findByExpiryDateBetweenAndIsActiveTrueOrderByExpiryDateAsc(today, today.plusDays(alertDays))
                .stream()
                .map(lot -> mapStandardLot(lot, standard(lot.getStandardId())))
                .toList();
    }

    private List<ReagentLotResponse> mapLots(List<LabReagentLot> lots) {
        Map<UUID, LabReagent> reagents = reagentRepository.findAllById(lots.stream().map(LabReagentLot::getReagentId).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(LabReagent::getId, Function.identity()));
        return lots.stream().map(lot -> mapLot(lot, reagents.get(lot.getReagentId()))).toList();
    }

    private ReagentResponse mapReagent(LabReagent reagent, List<LabReagentLot> lots) {
        LocalDate today = LocalDate.now();
        return ReagentResponse.builder()
                .id(reagent.getId())
                .reagentCode(reagent.getReagentCode())
                .reagentName(reagent.getReagentName())
                .grade(reagent.getGrade())
                .manufacturer(reagent.getManufacturer())
                .storageCondition(reagent.getStorageCondition())
                .activeLotCount(lots.stream().filter(lot -> "ACTIVE".equals(computedStatus(lot.getStatus(), lot.getExpiryDate()))).count())
                .hasExpiringLot(lots.stream().anyMatch(lot -> !lot.getExpiryDate().isBefore(today) && !lot.getExpiryDate().isAfter(today.plusDays(30))))
                .hasExpiredLot(lots.stream().anyMatch(lot -> lot.getExpiryDate().isBefore(today)))
                .isActive(reagent.getIsActive())
                .createdAt(reagent.getCreatedAt())
                .build();
    }

    private ReagentLotResponse mapLot(LabReagentLot lot, LabReagent reagent) {
        return ReagentLotResponse.builder()
                .id(lot.getId())
                .reagentId(lot.getReagentId())
                .reagentCode(reagent != null ? reagent.getReagentCode() : null)
                .reagentName(reagent != null ? reagent.getReagentName() : null)
                .lotNumber(lot.getLotNumber())
                .supplier(lot.getSupplier())
                .receivedDate(lot.getReceivedDate())
                .expiryDate(lot.getExpiryDate())
                .quantityReceived(lot.getQuantityReceived())
                .quantityUsed(lot.getQuantityUsed())
                .quantityRemaining(lot.getQuantityReceived().subtract(lot.getQuantityUsed()))
                .unit(lot.getUnit())
                .storedStatus(lot.getStatus())
                .status(computedStatus(lot.getStatus(), lot.getExpiryDate()))
                .isActive(lot.getIsActive())
                .build();
    }

    private ReferenceStandardResponse mapStandard(LabReferenceStandard standard, List<LabReferenceStandardLot> lots) {
        LocalDate today = LocalDate.now();
        return ReferenceStandardResponse.builder()
                .id(standard.getId())
                .standardCode(standard.getStandardCode())
                .standardName(standard.getStandardName())
                .pharmacopeia(standard.getPharmacopeia())
                .storageCondition(standard.getStorageCondition())
                .activeLotCount(lots.stream().filter(lot -> "ACTIVE".equals(computedStatus(lot.getStatus(), lot.getExpiryDate()))).count())
                .hasExpiringLot(lots.stream().anyMatch(lot -> !lot.getExpiryDate().isBefore(today) && !lot.getExpiryDate().isAfter(today.plusDays(30))))
                .hasExpiredLot(lots.stream().anyMatch(lot -> lot.getExpiryDate().isBefore(today)))
                .isActive(standard.getIsActive())
                .createdAt(standard.getCreatedAt())
                .build();
    }

    private ReferenceStandardLotResponse mapStandardLot(LabReferenceStandardLot lot, LabReferenceStandard standard) {
        return ReferenceStandardLotResponse.builder()
                .id(lot.getId())
                .standardId(lot.getStandardId())
                .standardCode(standard.getStandardCode())
                .standardName(standard.getStandardName())
                .lotNumber(lot.getLotNumber())
                .potency(lot.getPotency())
                .receivedDate(lot.getReceivedDate())
                .expiryDate(lot.getExpiryDate())
                .quantityReceived(lot.getQuantityReceived())
                .quantityUsed(lot.getQuantityUsed())
                .quantityRemaining(lot.getQuantityReceived().subtract(lot.getQuantityUsed()))
                .unit(lot.getUnit())
                .storedStatus(lot.getStatus())
                .status(computedStatus(lot.getStatus(), lot.getExpiryDate()))
                .isActive(lot.getIsActive())
                .build();
    }

    private String computedStatus(String storedStatus, LocalDate expiryDate) {
        if (expiryDate != null && expiryDate.isBefore(LocalDate.now())) {
            return "EXPIRED";
        }
        return StringUtils.hasText(storedStatus) ? storedStatus : "ACTIVE";
    }

    private void ensureRemainingNonNegative(BigDecimal received, BigDecimal used) {
        if (received.subtract(used).compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessConflictException("Quantity remaining cannot be negative");
        }
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String required(String value, String field) {
        if (!StringUtils.hasText(value)) {
            throw new BusinessConflictException(field + " is required");
        }
        return value.trim();
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String actor(String value) {
        return StringUtils.hasText(value) ? value.trim() : "system";
    }

    private LabReagent reagent(UUID id) {
        return reagentRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Reagent not found: " + id));
    }

    private LabReferenceStandard standard(UUID id) {
        return standardRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Reference standard not found: " + id));
    }
}
