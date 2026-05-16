package com.batchsphere.core.masterdata.supplier.sqa.service;

import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierResponse;
import com.batchsphere.core.masterdata.supplier.sqa.dto.SupplierQualityAgreementDTO.*;
import com.batchsphere.core.masterdata.supplier.sqa.entity.SupplierQualityAgreementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface SupplierQualityAgreementService {
    Response create(Request request);
    Response get(UUID id);
    Page<Response> list(UUID supplierId, SupplierQualityAgreementStatus status, Pageable pageable);
    Response update(UUID id, Request request);
    Response updateStatus(UUID id, StatusRequest request);
    List<Response> findExpiringSoon(int days);
    List<Response> findBySupplier(UUID supplierId);
    List<SupplierResponse> findSuppliersWithoutSqa();
}
