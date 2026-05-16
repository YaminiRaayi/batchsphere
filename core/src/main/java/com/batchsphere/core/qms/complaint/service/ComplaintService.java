package com.batchsphere.core.qms.complaint.service;

import com.batchsphere.core.qms.complaint.dto.ComplaintResponse;
import com.batchsphere.core.qms.complaint.dto.ComplaintStatusUpdateRequest;
import com.batchsphere.core.qms.complaint.dto.ComplaintSummaryResponse;
import com.batchsphere.core.qms.complaint.dto.CreateComplaintRequest;
import com.batchsphere.core.qms.complaint.dto.UpdateComplaintRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ComplaintService {

    ComplaintResponse createComplaint(CreateComplaintRequest request);

    Page<ComplaintResponse> getAllComplaints(Pageable pageable);

    ComplaintResponse getComplaintById(UUID id);

    ComplaintResponse updateComplaint(UUID id, UpdateComplaintRequest request);

    ComplaintResponse updateStatus(UUID id, ComplaintStatusUpdateRequest request);

    ComplaintResponse linkDeviation(UUID complaintId, UUID deviationId);

    ComplaintResponse linkCapa(UUID complaintId, UUID capaId);

    ComplaintSummaryResponse getSummary();
}
