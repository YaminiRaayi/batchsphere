package com.batchsphere.core.masterdata.vendor.service;

import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.vendor.dto.VendorRequest;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VendorServiceImpl implements VendorService {

    private final VendorRepository vendorRepository;

    @Override
    public Vendor createVendor(VendorRequest request) {
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
                .isApproved(false)
                .isActive(true)
                .createdBy(request.getCreatedBy())
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
        return vendorRepository.findByIsActiveTrue(pageable);
    }

    @Override
    public Vendor updateVendor(UUID id, VendorRequest request) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));

        if (!vendor.getVendorCode().equals(request.getVendorCode())
                && vendorRepository.existsByVendorCode(request.getVendorCode())) {
            throw new DuplicateResourceException("Vendor code already exists: " + request.getVendorCode());
        }

        vendor.setVendorCode(request.getVendorCode());
        vendor.setVendorName(request.getVendorName());
        vendor.setContactPerson(request.getContactPerson());
        vendor.setEmail(request.getEmail());
        vendor.setPhone(request.getPhone());
        vendor.setUpdatedBy(request.getCreatedBy());
        vendor.setUpdatedAt(LocalDateTime.now());

        return vendorRepository.save(vendor);
    }

    @Override
    public void deactivateVendor(UUID id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));

        vendor.setIsActive(false);
        vendor.setUpdatedAt(LocalDateTime.now());

        vendorRepository.save(vendor);
    }
}
