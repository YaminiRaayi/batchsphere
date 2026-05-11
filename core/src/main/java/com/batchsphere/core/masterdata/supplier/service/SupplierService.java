package com.batchsphere.core.masterdata.supplier.service;

import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierRequest;
import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierResponse;

import java.util.List;
import java.util.UUID;

public interface SupplierService {

    SupplierResponse createSupplier(SupplierRequest request);

    SupplierResponse getSupplier(UUID id);

    List<SupplierResponse> getAllSuppliers();

    SupplierResponse updateSupplier(UUID id, SupplierRequest request);

    void deactivateSupplier(UUID id);
}
