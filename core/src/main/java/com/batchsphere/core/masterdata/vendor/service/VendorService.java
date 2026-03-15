package com.batchsphere.core.masterdata.vendor.service;

import com.batchsphere.core.masterdata.vendor.dto.VendorRequest;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface VendorService {

    Vendor createVendor(VendorRequest request);

    Vendor getVendorById(UUID id);

    Page<Vendor> getAllVendors(Pageable pageable);

    Vendor updateVendor(UUID id, VendorRequest request);

    void deactivateVendor(UUID id);
}
