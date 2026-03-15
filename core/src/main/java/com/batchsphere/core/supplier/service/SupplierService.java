package com.batchsphere.core.supplier.service;

import com.batchsphere.core.supplier.dto.SupplierRequest;
import com.batchsphere.core.supplier.entity.Supplier;

import java.util.List;
import java.util.UUID;

public interface SupplierService {

    Supplier createSupplier(SupplierRequest request);

    Supplier getSupplier(UUID id);

    List<Supplier> getAllSuppliers();

}