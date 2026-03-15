package com.batchsphere.core.exception.supplier.service;

import com.batchsphere.core.exception.supplier.dto.supplier.dto.SupplierRequest;
import com.batchsphere.core.exception.supplier.entity.Supplier;
import com.batchsphere.core.exception.supplier.repository.SupplierRepository;
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

    //TODO: here need to make changes for exceptions
    @Override
    public Supplier getSupplier(UUID id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found"));
    }

    @Override
    public List<Supplier> getAllSuppliers() {
        return supplierRepository.findAll();
    }
}
