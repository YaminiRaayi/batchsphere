package com.batchsphere.core.masterdata.businessunit.service;

import com.batchsphere.core.masterdata.businessunit.dto.CreateBusinessUnitRequest;
import com.batchsphere.core.masterdata.businessunit.dto.UpdateBusinessUnitRequest;
import com.batchsphere.core.masterdata.businessunit.entity.BusinessUnit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface BusinessUnitService {

    BusinessUnit createBusinessUnit(CreateBusinessUnitRequest request);

    BusinessUnit getBusinessUnitById(UUID id);

    Page<BusinessUnit> getAllBusinessUnits(Pageable pageable);

    BusinessUnit updateBusinessUnit(UUID id, UpdateBusinessUnitRequest request);

    void deactivateBusinessUnit(UUID id);
}
