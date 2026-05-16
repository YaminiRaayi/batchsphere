package com.batchsphere.core.lims.equipment.service;

import com.batchsphere.core.lims.equipment.dto.CreateEquipmentRequest;
import com.batchsphere.core.lims.equipment.dto.CreateQualificationRecordRequest;
import com.batchsphere.core.lims.equipment.dto.EquipmentResponse;
import com.batchsphere.core.lims.equipment.dto.EquipmentSummaryResponse;
import com.batchsphere.core.lims.equipment.dto.QualificationRecordResponse;
import com.batchsphere.core.lims.equipment.dto.UpdateEquipmentRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface EquipmentService {

    EquipmentResponse createEquipment(CreateEquipmentRequest request);

    Page<EquipmentResponse> getAllEquipment(Pageable pageable);

    EquipmentResponse getEquipmentById(UUID id);

    EquipmentResponse updateEquipment(UUID id, UpdateEquipmentRequest request);

    QualificationRecordResponse addQualificationRecord(UUID equipmentId, CreateQualificationRecordRequest request);

    List<QualificationRecordResponse> getQualificationRecords(UUID equipmentId);

    EquipmentSummaryResponse getSummary();

    List<EquipmentResponse> getActiveInstruments();
}
