package com.batchsphere.core.qms.changecontrol.service;

import com.batchsphere.core.qms.changecontrol.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ChangeControlService {
    ChangeControlResponse create(CreateChangeControlRequest request);
    Page<ChangeControlResponse> getAll(Pageable pageable);
    ChangeControlResponse getById(UUID id);
    ChangeControlResponse update(UUID id, UpdateChangeControlRequest request);
    ChangeControlResponse submitForReview(UUID id);
    ChangeControlResponse approve(UUID id, ChangeControlApproveRequest request);
    ChangeControlResponse reject(UUID id, ChangeControlRejectRequest request);
    ChangeControlResponse startImplementation(UUID id);
    ChangeControlResponse moveToEffectivenessCheck(UUID id);
    ChangeControlResponse close(UUID id, ChangeControlCloseRequest request);
    ChangeControlResponse cancel(UUID id, String reason);

    ChangeControlAffectedEntityResponse addAffectedEntity(UUID id, AddAffectedEntityRequest request);
    void removeAffectedEntity(UUID id, UUID entityId);

    ChangeControlTaskResponse addTask(UUID id, CreateTaskRequest request);
    ChangeControlTaskResponse updateTaskStatus(UUID id, UUID taskId, UpdateTaskStatusRequest request);
    void removeTask(UUID id, UUID taskId);
}
