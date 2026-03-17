package com.batchsphere.core.transcations.grn.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.transcations.grn.entity.ContainerType;
import com.batchsphere.core.transcations.grn.entity.LabelStatus;
import com.batchsphere.core.transcations.inventory.entity.InventoryStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class GrnContainerResponse {
    UUID id;
    UUID grnId;
    UUID grnItemId;
    UUID materialId;
    UUID batchId;
    UUID palletId;
    String containerNumber;
    ContainerType containerType;
    String vendorBatch;
    String internalLot;
    BigDecimal quantity;
    String uom;
    LocalDate manufactureDate;
    LocalDate expiryDate;
    LocalDate retestDate;
    StorageCondition storageCondition;
    InventoryStatus inventoryStatus;
    LabelStatus labelStatus;
    Boolean sampled;
    BigDecimal sampledQuantity;
    String samplingLocation;
    String sampledBy;
    LocalDateTime sampledAt;
}
