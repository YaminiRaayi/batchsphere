package com.batchsphere.core.traceability.service;

import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.qms.capa.repository.CapaRepository;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
import com.batchsphere.core.traceability.dto.LotTraceabilityResponse;
import com.batchsphere.core.traceability.dto.TraceabilityEvent;
import com.batchsphere.core.transactions.grn.entity.Grn;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.grn.repository.GrnItemRepository;
import com.batchsphere.core.transactions.grn.repository.GrnRepository;
import com.batchsphere.core.transactions.inventory.repository.InventoryTransactionRepository;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigation;
import com.batchsphere.core.transactions.sampling.entity.Sample;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequest;
import com.batchsphere.core.transactions.sampling.repository.QcDispositionRepository;
import com.batchsphere.core.transactions.sampling.repository.QcInvestigationRepository;
import com.batchsphere.core.transactions.sampling.repository.QcTestResultRepository;
import com.batchsphere.core.transactions.sampling.repository.SampleRepository;
import com.batchsphere.core.transactions.sampling.repository.SamplingRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LotTraceabilityServiceImpl implements LotTraceabilityService {

    private final GrnRepository grnRepository;
    private final GrnItemRepository grnItemRepository;
    private final MaterialRepository materialRepository;
    private final SamplingRequestRepository samplingRequestRepository;
    private final SampleRepository sampleRepository;
    private final QcTestResultRepository qcTestResultRepository;
    private final QcDispositionRepository qcDispositionRepository;
    private final QcInvestigationRepository qcInvestigationRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final DeviationRepository deviationRepository;
    private final CapaRepository capaRepository;

    @Override
    @Transactional(readOnly = true)
    public LotTraceabilityResponse getTraceability(String searchKey) {
        String trimmedKey = searchKey.trim();

        Grn grn = grnRepository.findByGrnNumber(trimmedKey)
                .orElse(null);

        GrnItem item;
        if (grn != null) {
            List<GrnItem> items = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(grn.getId());
            if (items.isEmpty()) {
                throw new ResourceNotFoundException("No items found for GRN: " + trimmedKey);
            }
            item = items.get(0);
        } else {
            List<GrnItem> items = grnItemRepository.findByVendorBatchIgnoreCaseAndIsActiveTrueOrderByCreatedAtDesc(trimmedKey);
            if (items.isEmpty()) {
                throw new ResourceNotFoundException("No lot or GRN found for: " + trimmedKey);
            }
            item = items.get(0);
            grn = grnRepository.findById(item.getGrnId())
                    .orElseThrow(() -> new ResourceNotFoundException("GRN not found for item: " + item.getId()));
        }

        Material material = materialRepository.findById(item.getMaterialId()).orElse(null);
        String materialCode = material != null ? material.getMaterialCode() : null;
        String materialName = material != null ? material.getMaterialName() : null;

        List<TraceabilityEvent> timeline = new ArrayList<>();

        // GRN receipt
        timeline.add(TraceabilityEvent.builder()
                .eventType("GRN_RECEIVED")
                .eventLabel("GRN Received")
                .status(grn.getStatus().name())
                .actor(grn.getCreatedBy())
                .timestamp(grn.getCreatedAt())
                .referenceId(grn.getId().toString())
                .referenceNumber(grn.getGrnNumber())
                .remarks(grn.getRemarks())
                .build());

        // CoA review
        if (grn.getCoaReviewedAt() != null) {
            timeline.add(TraceabilityEvent.builder()
                    .eventType("COA_REVIEWED")
                    .eventLabel("CoA Review")
                    .status(grn.getCoaReviewStatus().name())
                    .actor(grn.getCoaReviewedBy())
                    .timestamp(grn.getCoaReviewedAt())
                    .referenceId(grn.getId().toString())
                    .referenceNumber(grn.getGrnNumber())
                    .remarks(grn.getCoaReviewRemarks())
                    .build());
        }

        // Sampling requests
        List<SamplingRequest> samplingRequests = samplingRequestRepository.findByGrnIdAndIsActiveTrue(grn.getId());
        for (SamplingRequest sr : samplingRequests) {
            timeline.add(TraceabilityEvent.builder()
                    .eventType("SAMPLING_REQUESTED")
                    .eventLabel("Sampling Request Created")
                    .status(sr.getRequestStatus().name())
                    .actor(sr.getCreatedBy())
                    .timestamp(sr.getCreatedAt())
                    .referenceId(sr.getId().toString())
                    .referenceNumber(null)
                    .remarks("Cycle " + sr.getCycleNumber())
                    .build());

            if (sr.getQcDecidedAt() != null) {
                timeline.add(TraceabilityEvent.builder()
                        .eventType("QC_DECISION_RECORDED")
                        .eventLabel("QC Final Decision")
                        .status(sr.getRequestStatus().name())
                        .actor(sr.getQcDecidedBy())
                        .timestamp(sr.getQcDecidedAt())
                        .referenceId(sr.getId().toString())
                        .referenceNumber(null)
                        .remarks(sr.getQcDecisionRemarks())
                        .build());
            }

            // QC test results
            sampleRepository.findBySamplingRequestId(sr.getId()).ifPresent(sample -> {
                var results = qcTestResultRepository.findBySampleIdAndIsActiveTrueOrderByCreatedAtAsc(sample.getId());
                long passCount = results.stream().filter(r -> Boolean.TRUE.equals(r.getPassFailFlag())).count();
                long failCount = results.stream().filter(r -> Boolean.FALSE.equals(r.getPassFailFlag())).count();
                long enteredCount = results.stream().filter(r -> r.getEnteredAt() != null).count();
                if (enteredCount > 0) {
                    results.stream().filter(r -> r.getEnteredAt() != null).findFirst().ifPresent(first ->
                        timeline.add(TraceabilityEvent.builder()
                                .eventType("QC_RESULTS_RECORDED")
                                .eventLabel("QC Worksheet Results Entered")
                                .status(null)
                                .actor(first.getUpdatedBy() != null ? first.getUpdatedBy() : first.getCreatedBy())
                                .timestamp(first.getEnteredAt())
                                .referenceId(sample.getId().toString())
                                .referenceNumber(null)
                                .remarks(enteredCount + " results: " + passCount + " pass, " + failCount + " fail")
                                .build())
                    );
                }

                qcDispositionRepository.findBySampleId(sample.getId()).ifPresent(disp -> {
                    if (disp.getUpdatedAt() != null) {
                        timeline.add(TraceabilityEvent.builder()
                                .eventType("QC_DISPOSITION")
                                .eventLabel("QC Disposition")
                                .status(disp.getStatus().name())
                                .actor(disp.getUpdatedBy())
                                .timestamp(disp.getUpdatedAt())
                                .referenceId(disp.getId().toString())
                                .referenceNumber(null)
                                .remarks(null)
                                .build());
                    }
                });
            });

            // Investigations
            qcInvestigationRepository.findBySamplingRequestIdAndIsActiveTrueOrderByCreatedAtAsc(sr.getId())
                    .forEach(inv -> addInvestigationEvents(timeline, inv));
        }

        // Inventory transactions
        if (item.getBatchId() != null) {
            inventoryTransactionRepository.findByBatchIdOrderByCreatedAtAsc(item.getBatchId())
                    .forEach(tx -> timeline.add(TraceabilityEvent.builder()
                            .eventType("INVENTORY_" + tx.getTransactionType().name())
                            .eventLabel("Inventory: " + tx.getTransactionType().name().replace("_", " "))
                            .status(null)
                            .actor(tx.getCreatedBy())
                            .timestamp(tx.getCreatedAt())
                            .referenceId(tx.getId().toString())
                            .referenceNumber(tx.getReferenceNumber())
                            .remarks(tx.getRemarks())
                            .build()));
        }

        // Linked deviation
        String linkedDeviationId = grn.getLinkedDeviationId() != null ? grn.getLinkedDeviationId().toString() : null;
        String linkedDeviationNumber = grn.getLinkedDeviationNumber();

        deviationRepository.findBySourceEntityIdAndIsActiveTrue(grn.getId())
                .forEach(dev -> {
                    timeline.add(TraceabilityEvent.builder()
                            .eventType("DEVIATION_CREATED")
                            .eventLabel("Deviation Created")
                            .status(dev.getStatus().name())
                            .actor(dev.getCreatedBy())
                            .timestamp(dev.getCreatedAt())
                            .referenceId(dev.getId().toString())
                            .referenceNumber(dev.getDeviationNumber())
                            .remarks(dev.getTitle())
                            .build());

                    capaRepository.findByDeviationIdAndIsActiveTrue(dev.getId())
                            .forEach(capa -> timeline.add(TraceabilityEvent.builder()
                                    .eventType("CAPA_CREATED")
                                    .eventLabel("CAPA Created")
                                    .status(capa.getStatus().name())
                                    .actor(capa.getCreatedBy())
                                    .timestamp(capa.getCreatedAt())
                                    .referenceId(capa.getId().toString())
                                    .referenceNumber(capa.getCapaNumber())
                                    .remarks(capa.getTitle())
                                    .build()));
                });

        timeline.sort(Comparator.comparing(TraceabilityEvent::getTimestamp,
                Comparator.nullsLast(Comparator.naturalOrder())));

        return LotTraceabilityResponse.builder()
                .searchKey(trimmedKey)
                .grnId(grn.getId().toString())
                .grnNumber(grn.getGrnNumber())
                .grnStatus(grn.getStatus().name())
                .receiptDate(grn.getReceiptDate())
                .coaReviewStatus(grn.getCoaReviewStatus().name())
                .coaReviewedBy(grn.getCoaReviewedBy())
                .coaReviewedAt(grn.getCoaReviewedAt())
                .linkedDeviationId(linkedDeviationId)
                .linkedDeviationNumber(linkedDeviationNumber)
                .materialId(item.getMaterialId().toString())
                .materialCode(materialCode)
                .materialName(materialName)
                .vendorBatch(item.getVendorBatch())
                .receivedQuantity(item.getReceivedQuantity())
                .uom(item.getUom())
                .timeline(timeline)
                .build();
    }

    private void addInvestigationEvents(List<TraceabilityEvent> timeline, QcInvestigation inv) {
        timeline.add(TraceabilityEvent.builder()
                .eventType("INVESTIGATION_OPENED")
                .eventLabel("QC Investigation Opened (" + inv.getInvestigationType().name() + ")")
                .status(inv.getStatus().name())
                .actor(inv.getOpenedBy())
                .timestamp(inv.getOpenedAt())
                .referenceId(inv.getId().toString())
                .referenceNumber(inv.getInvestigationNumber())
                .remarks(inv.getReason())
                .build());

        if (inv.getPhaseTwoEscalatedAt() != null) {
            timeline.add(TraceabilityEvent.builder()
                    .eventType("INVESTIGATION_PHASE_2")
                    .eventLabel("Investigation Advanced to Phase 2")
                    .status("PHASE_II")
                    .actor(inv.getPhaseTwoEscalatedBy())
                    .timestamp(inv.getPhaseTwoEscalatedAt())
                    .referenceId(inv.getId().toString())
                    .referenceNumber(inv.getInvestigationNumber())
                    .remarks(inv.getPhaseOneSummary())
                    .build());
        }

        if (inv.getClosedAt() != null) {
            timeline.add(TraceabilityEvent.builder()
                    .eventType("INVESTIGATION_CLOSED")
                    .eventLabel("Investigation Closed")
                    .status(inv.getStatus().name())
                    .actor(inv.getClosedBy())
                    .timestamp(inv.getClosedAt())
                    .referenceId(inv.getId().toString())
                    .referenceNumber(inv.getInvestigationNumber())
                    .remarks(inv.getResolutionRemarks())
                    .build());
        }
    }
}
