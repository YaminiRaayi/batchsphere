package com.batchsphere.core.masterdata.vendorbusinessunit.service;

import com.batchsphere.core.masterdata.vendorbusinessunit.dto.CreateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.UpdateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface VendorBusinessUnitService {

    VendorBusinessUnit createVendorBusinessUnit(UUID vendorId, CreateVendorBusinessUnitRequest request);

    VendorBusinessUnit getVendorBusinessUnitById(UUID id);

    Page<VendorBusinessUnit> getAllVendorBusinessUnits(UUID vendorId, Pageable pageable);

    VendorBusinessUnit updateVendorBusinessUnit(UUID vendorId, UUID id, UpdateVendorBusinessUnitRequest request);

    void deactivateVendorBusinessUnit(UUID id);
}
