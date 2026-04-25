package com.batchsphere.core.masterdata.businessunit.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.businessunit.dto.CreateBusinessUnitRequest;
import com.batchsphere.core.masterdata.businessunit.dto.UpdateBusinessUnitRequest;
import com.batchsphere.core.masterdata.businessunit.entity.BusinessUnit;
import com.batchsphere.core.masterdata.businessunit.repository.BusinessUnitRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BusinessUnitServiceImpl implements BusinessUnitService {

    private final BusinessUnitRepository businessUnitRepository;
    private final WarehouseRepository warehouseRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public BusinessUnit createBusinessUnit(CreateBusinessUnitRequest request) {
        String actor = authenticatedActorService.currentActor();
        if (businessUnitRepository.existsByUnitCode(request.getUnitCode())) {
            throw new DuplicateResourceException("Business unit code already exists: " + request.getUnitCode());
        }

        BusinessUnit businessUnit = BusinessUnit.builder()
                .id(UUID.randomUUID())
                .unitCode(request.getUnitCode())
                .unitName(request.getUnitName())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();
        return businessUnitRepository.save(businessUnit);
    }

    @Override
    public BusinessUnit getBusinessUnitById(UUID id) {
        return businessUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business unit not found with id: " + id));
    }

    @Override
    public Page<BusinessUnit> getAllBusinessUnits(Pageable pageable) {
        return businessUnitRepository.findByIsActiveTrue(pageable);
    }

    @Override
    public BusinessUnit updateBusinessUnit(UUID id, UpdateBusinessUnitRequest request) {
        String actor = authenticatedActorService.currentActor();
        BusinessUnit businessUnit = getBusinessUnitById(id);
        if (!businessUnit.getUnitCode().equals(request.getUnitCode())
                && businessUnitRepository.existsByUnitCode(request.getUnitCode())) {
            throw new DuplicateResourceException("Business unit code already exists: " + request.getUnitCode());
        }

        businessUnit.setUnitCode(request.getUnitCode());
        businessUnit.setUnitName(request.getUnitName());
        businessUnit.setDescription(request.getDescription());
        businessUnit.setUpdatedBy(actor);
        businessUnit.setUpdatedAt(LocalDateTime.now());
        return businessUnitRepository.save(businessUnit);
    }

    @Override
    public void deactivateBusinessUnit(UUID id) {
        String actor = authenticatedActorService.currentActor();
        BusinessUnit businessUnit = getBusinessUnitById(id);
        if (warehouseRepository.existsByBusinessUnitIdAndIsActiveTrue(id)) {
            throw new BusinessConflictException("Cannot deactivate business unit with active warehouses");
        }
        businessUnit.setIsActive(false);
        businessUnit.setUpdatedBy(actor);
        businessUnit.setUpdatedAt(LocalDateTime.now());
        businessUnitRepository.save(businessUnit);
    }
}
