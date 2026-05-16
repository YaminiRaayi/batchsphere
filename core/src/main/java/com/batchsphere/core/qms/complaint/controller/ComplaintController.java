package com.batchsphere.core.qms.complaint.controller;

import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.qms.complaint.dto.ComplaintResponse;
import com.batchsphere.core.qms.complaint.dto.ComplaintStatusUpdateRequest;
import com.batchsphere.core.qms.complaint.dto.ComplaintSummaryResponse;
import com.batchsphere.core.qms.complaint.dto.CreateComplaintRequest;
import com.batchsphere.core.qms.complaint.dto.LinkCapaRequest;
import com.batchsphere.core.qms.complaint.dto.LinkDeviationRequest;
import com.batchsphere.core.qms.complaint.dto.UpdateComplaintRequest;
import com.batchsphere.core.qms.complaint.service.ComplaintService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;
    private final CsvExportService csvExportService;

    @PostMapping
    public ResponseEntity<ComplaintResponse> createComplaint(@Valid @RequestBody CreateComplaintRequest request) {
        return ResponseEntity.ok(complaintService.createComplaint(request));
    }

    @GetMapping
    public ResponseEntity<?> getAllComplaints(Pageable pageable,
                                              @RequestParam(required = false) String format,
                                              @RequestHeader(value = "Accept", required = false) String accept) {
        Page<ComplaintResponse> page = complaintService.getAllComplaints(pageable);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("complaints.csv", page.getContent());
        }
        return ResponseEntity.ok(page);
    }

    @GetMapping("/summary")
    public ResponseEntity<ComplaintSummaryResponse> getSummary() {
        return ResponseEntity.ok(complaintService.getSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComplaintResponse> getComplaintById(@PathVariable UUID id) {
        return ResponseEntity.ok(complaintService.getComplaintById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ComplaintResponse> updateComplaint(@PathVariable UUID id,
                                                             @Valid @RequestBody UpdateComplaintRequest request) {
        return ResponseEntity.ok(complaintService.updateComplaint(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ComplaintResponse> updateStatus(@PathVariable UUID id,
                                                          @Valid @RequestBody ComplaintStatusUpdateRequest request) {
        return ResponseEntity.ok(complaintService.updateStatus(id, request));
    }

    @PostMapping("/{id}/link-deviation")
    public ResponseEntity<ComplaintResponse> linkDeviation(@PathVariable UUID id,
                                                           @Valid @RequestBody LinkDeviationRequest request) {
        return ResponseEntity.ok(complaintService.linkDeviation(id, request.getDeviationId()));
    }

    @PostMapping("/{id}/link-capa")
    public ResponseEntity<ComplaintResponse> linkCapa(@PathVariable UUID id,
                                                      @Valid @RequestBody LinkCapaRequest request) {
        return ResponseEntity.ok(complaintService.linkCapa(id, request.getCapaId()));
    }
}
