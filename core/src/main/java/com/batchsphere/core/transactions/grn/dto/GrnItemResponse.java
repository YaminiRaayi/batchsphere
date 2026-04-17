package com.batchsphere.core.transactions.grn.dto;

import com.batchsphere.core.transactions.grn.entity.QcStatus;
import com.batchsphere.core.transactions.grn.entity.ContainerType;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class GrnItemResponse {
    UUID id;
    Integer lineNumber;
    UUID materialId;
    UUID batchId;
    BigDecimal receivedQuantity;
    BigDecimal acceptedQuantity;
    BigDecimal rejectedQuantity;
    String uom;
    UUID palletId;
    ContainerType containerType;
    Integer numberOfContainers;
    BigDecimal quantityPerContainer;
    String vendorBatch;
    LocalDate manufactureDate;
    LocalDate expiryDate;
    LocalDate retestDate;
    BigDecimal unitPrice;
    BigDecimal totalPrice;
    QcStatus qcStatus;
    String description;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
    List<GrnDocumentResponse> documents;
}
