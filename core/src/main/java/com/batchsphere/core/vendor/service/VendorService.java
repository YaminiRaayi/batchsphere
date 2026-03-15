package com.batchsphere.core.vendor.service;

import com.batchsphere.core.vendor.dto.VendorRequest;
import com.batchsphere.core.vendor.entity.Vendor;
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
