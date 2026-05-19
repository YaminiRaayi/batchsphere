package com.batchsphere.core.lims.reagent.service;

import com.batchsphere.core.lims.reagent.dto.ReagentDtos.CreateReagentLotRequest;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.CreateReagentRequest;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.ReagentLotResponse;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.ReagentResponse;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.UpdateReagentLotRequest;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.CreateReferenceStandardLotRequest;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.CreateReferenceStandardRequest;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.ReferenceStandardLotResponse;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.ReferenceStandardResponse;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.UpdateReferenceStandardLotRequest;

import java.util.List;
import java.util.UUID;

public interface ReagentInventoryService {
    List<ReagentResponse> listReagents();
    ReagentResponse createReagent(CreateReagentRequest request);
    List<ReagentLotResponse> listLots(UUID reagentId);
    ReagentLotResponse addLot(UUID reagentId, CreateReagentLotRequest request);
    ReagentLotResponse updateLot(UUID reagentId, UUID lotId, UpdateReagentLotRequest request);
    List<ReagentLotResponse> expiringLots(int alertDays);
    List<ReagentLotResponse> availableLots();

    List<ReferenceStandardResponse> listReferenceStandards();
    ReferenceStandardResponse createReferenceStandard(CreateReferenceStandardRequest request);
    List<ReferenceStandardLotResponse> listReferenceStandardLots(UUID standardId);
    ReferenceStandardLotResponse addReferenceStandardLot(UUID standardId, CreateReferenceStandardLotRequest request);
    ReferenceStandardLotResponse updateReferenceStandardLot(UUID standardId, UUID lotId, UpdateReferenceStandardLotRequest request);
    List<ReferenceStandardLotResponse> expiringReferenceStandardLots(int alertDays);
}
