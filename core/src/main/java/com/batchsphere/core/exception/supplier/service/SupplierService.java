package com.batchsphere.core.exception.supplier.service;

import com.batchsphere.core.exception.supplier.dto.supplier.dto.SupplierRequest;
import com.batchsphere.core.exception.supplier.entity.Supplier;

import java.util.List;
import java.util.UUID;

public interface SupplierService {

    Supplier createSupplier(SupplierRequest request);

    Supplier getSupplier(UUID id);

    List<Supplier> getAllSuppliers();

}