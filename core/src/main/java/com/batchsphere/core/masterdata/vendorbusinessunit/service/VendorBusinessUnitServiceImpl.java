package com.batchsphere.core.masterdata.vendorbusinessunit.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.CreateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.UpdateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VendorBusinessUnitServiceImpl implements VendorBusinessUnitService {

    private final VendorBusinessUnitRepository vendorBusinessUnitRepository;
    private final VendorRepository vendorRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public VendorBusinessUnit createVendorBusinessUnit(UUID vendorId, CreateVendorBusinessUnitRequest request) {
        String actor = authenticatedActorService.currentActor();
        validateVendorExists(vendorId);

        VendorBusinessUnit vendorBusinessUnit = VendorBusinessUnit.builder()
                .id(UUID.randomUUID())
                .vendorId(vendorId)
                .unitName(request.getUnitName())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        return vendorBusinessUnitRepository.save(vendorBusinessUnit);
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

        existing.setVendorId(vendorId);
        existing.setUnitName(request.getUnitName());
        existing.setAddress(request.getAddress());
        existing.setCity(request.getCity());
        existing.setState(request.getState());
        existing.setCountry(request.getCountry());
        existing.setUpdatedBy(actor);
        existing.setUpdatedAt(LocalDateTime.now());

        return vendorBusinessUnitRepository.save(existing);
    }

    @Override
    public void deactivateVendorBusinessUnit(UUID id) {
        String actor = authenticatedActorService.currentActor();
        VendorBusinessUnit existing = getVendorBusinessUnitById(id);
        existing.setIsActive(false);
        existing.setUpdatedBy(actor);
        existing.setUpdatedAt(LocalDateTime.now());
        vendorBusinessUnitRepository.save(existing);
    }

    private void validateVendorExists(UUID vendorId) {
        if (!vendorRepository.existsById(vendorId)) {
            throw new ResourceNotFoundException("Vendor not found with id: " + vendorId);
        }
    }
}
