package com.batchsphere.core.lims.equipment.controller;

import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.lims.equipment.dto.CreateEquipmentRequest;
import com.batchsphere.core.lims.equipment.dto.CreateQualificationRecordRequest;
import com.batchsphere.core.lims.equipment.dto.EquipmentResponse;
import com.batchsphere.core.lims.equipment.dto.EquipmentSummaryResponse;
import com.batchsphere.core.lims.equipment.dto.QualificationRecordResponse;
import com.batchsphere.core.lims.equipment.dto.UpdateEquipmentRequest;
import com.batchsphere.core.lims.equipment.service.EquipmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/equipment")
@RequiredArgsConstructor
public class EquipmentController {

    private final EquipmentService equipmentService;
    private final CsvExportService csvExportService;

    @GetMapping
    public ResponseEntity<?> getAllEquipment(Pageable pageable,
                                             @RequestParam(required = false) String format,
                                             @RequestHeader(value = "Accept", required = false) String accept) {
        Page<EquipmentResponse> page = equipmentService.getAllEquipment(pageable);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("equipment.csv", page.getContent());
        }
        return ResponseEntity.ok(page);
    }

    @PostMapping
    public ResponseEntity<EquipmentResponse> createEquipment(@Valid @RequestBody CreateEquipmentRequest request) {
        return ResponseEntity.ok(equipmentService.createEquipment(request));
    }

    @GetMapping("/active")
    public ResponseEntity<List<EquipmentResponse>> getActiveInstruments() {
        return ResponseEntity.ok(equipmentService.getActiveInstruments());
    }

    @GetMapping("/summary")
    public ResponseEntity<EquipmentSummaryResponse> getSummary() {
        return ResponseEntity.ok(equipmentService.getSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipmentResponse> getEquipmentById(@PathVariable UUID id) {
        return ResponseEntity.ok(equipmentService.getEquipmentById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EquipmentResponse> updateEquipment(@PathVariable UUID id,
                                                              @Valid @RequestBody UpdateEquipmentRequest request) {
        return ResponseEntity.ok(equipmentService.updateEquipment(id, request));
    }

    @GetMapping("/{id}/qualifications")
    public ResponseEntity<List<QualificationRecordResponse>> getQualificationRecords(@PathVariable UUID id) {
        return ResponseEntity.ok(equipmentService.getQualificationRecords(id));
    }

    @PostMapping("/{id}/qualifications")
    public ResponseEntity<QualificationRecordResponse> addQualificationRecord(
            @PathVariable UUID id,
            @Valid @RequestBody CreateQualificationRecordRequest request) {
        return ResponseEntity.ok(equipmentService.addQualificationRecord(id, request));
    }
}
