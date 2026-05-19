package com.batchsphere.core.lims.logbook.service;

import com.batchsphere.core.lims.logbook.dto.InstrumentLogbookDtos.CreateInstrumentUsageLogRequest;
import com.batchsphere.core.lims.logbook.dto.InstrumentLogbookDtos.InstrumentUsageLogResponse;

import java.util.List;
import java.util.UUID;

public interface InstrumentLogbookService {
    InstrumentUsageLogResponse createManualEntry(CreateInstrumentUsageLogRequest request, String actor);
    void logAutoUsage(UUID equipmentId, UUID samplingRequestId, String purpose, String actor);
    List<InstrumentUsageLogResponse> getEquipmentLogbook(UUID equipmentId);
    List<InstrumentUsageLogResponse> getLogbook(String usedBy);
}
