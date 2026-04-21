package com.batchsphere.core.transactions.grn.dto;

import com.batchsphere.core.transactions.grn.entity.GrnStatus;
import com.batchsphere.core.transactions.grn.entity.LabelStatus;
import com.batchsphere.core.transactions.grn.entity.LabelType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Builder
public record GrnLabelPrintDataResponse(
        UUID grnId,
        String grnNumber,
        LocalDate receiptDate,
        String invoiceNumber,
        GrnStatus status,
        List<LabelPrintEntry> entries
) {
    @Builder
    public record LabelPrintEntry(
            UUID grnItemId,
            Integer lineNumber,
            UUID materialId,
            String materialName,
            UUID batchId,
            String batchNumber,
            UUID palletId,
            String palletCode,
            UUID containerId,
            String containerNumber,
            String internalLot,
            BigDecimal quantity,
            String uom,
            LabelType labelType,
            LabelStatus labelStatus,
            String labelContent,
            String qrPayload,
            String qrCodeDataUrl,
            LocalDateTime generatedAt
    ) {
    }
}
