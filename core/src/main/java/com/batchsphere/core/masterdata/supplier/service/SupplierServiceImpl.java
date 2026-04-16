package com.batchsphere.core.masterdata.supplier.service;

import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierRequest;
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

    @Override
    public Supplier createSupplier(SupplierRequest request) {
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
                .isActive(true)
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .build();

        return supplierRepository.save(supplier);
    }

    @Override
    public Supplier getSupplier(UUID id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
    }

    @Override
    public List<Supplier> getAllSuppliers() {
        return supplierRepository.findAll().stream()
                .filter(supplier -> Boolean.TRUE.equals(supplier.getIsActive()))
                .toList();
    }

    @Override
    public Supplier updateSupplier(UUID id, SupplierRequest request) {
        Supplier supplier = getSupplier(id);

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
        supplier.setUpdatedBy(request.getCreatedBy());
        supplier.setUpdatedAt(LocalDateTime.now());

        return supplierRepository.save(supplier);
    }

    @Override
    public void deactivateSupplier(UUID id) {
        Supplier supplier = getSupplier(id);
        supplier.setIsActive(false);
        supplier.setUpdatedAt(LocalDateTime.now());
        supplierRepository.save(supplier);
    }
}
