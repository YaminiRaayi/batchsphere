package com.batchsphere.core.compliance.alcoa.service;

import com.batchsphere.core.compliance.alcoa.dto.AlcoaReadinessGap;
import com.batchsphere.core.compliance.alcoa.dto.AlcoaReadinessSummary;
import com.batchsphere.core.hrms.training.entity.TrainingAssignmentStatus;
import com.batchsphere.core.hrms.training.repository.TrainingAssignmentRepository;
import com.batchsphere.core.lims.em.repository.EmResultRepository;
import com.batchsphere.core.lims.equipment.repository.EquipmentRepository;
import com.batchsphere.core.lims.retentionsample.entity.RetentionSampleStatus;
import com.batchsphere.core.lims.reagent.repository.LabReagentLotRepository;
import com.batchsphere.core.lims.reagent.repository.LabReferenceStandardLotRepository;
import com.batchsphere.core.lims.retentionsample.repository.RetentionSampleRepository;
import com.batchsphere.core.lims.stability.repository.StabilityResultRepository;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationStatus;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationType;
import com.batchsphere.core.transactions.sampling.repository.QcInvestigationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlcoaReadinessServiceImpl implements AlcoaReadinessService {

    private static final EnumSet<QcInvestigationStatus> OPEN_INVESTIGATION_STATUSES =
            EnumSet.of(QcInvestigationStatus.PHASE_I, QcInvestigationStatus.PHASE_II, QcInvestigationStatus.QA_REVIEW_PENDING);

    private final QcInvestigationRepository qcInvestigationRepository;
    private final StabilityResultRepository stabilityResultRepository;
    private final EmResultRepository emResultRepository;
    private final EquipmentRepository equipmentRepository;
    private final TrainingAssignmentRepository trainingAssignmentRepository;
    private final RetentionSampleRepository retentionSampleRepository;
    private final LabReagentLotRepository reagentLotRepository;
    private final LabReferenceStandardLotRepository referenceStandardLotRepository;
    private final JdbcTemplate jdbcTemplate;

    private record GmpTable(String tableName, String entityType, String codeColumn, String routePrefix) {
    }

    private static final List<GmpTable> GMP_TABLES = List.of(
            new GmpTable("sampling_request", "SAMPLING_REQUEST", null, "/lims/sampling"),
            new GmpTable("qc_worksheet", "QC_WORKSHEET", null, "/lims/worksheets"),
            new GmpTable("qc_test_result", "QC_TEST_RESULT", "parameter_name", "/lims/worksheets"),
            new GmpTable("qc_investigation", "QC_INVESTIGATION", "investigation_number", "/lims/oos-investigations"),
            new GmpTable("stability_study", "STABILITY_STUDY", "study_number", "/lims/stability"),
            new GmpTable("stability_result", "STABILITY_RESULT", "parameter_name", "/lims/stability"),
            new GmpTable("em_result", "EM_RESULT", null, "/lims/env-monitoring"),
            new GmpTable("equipment", "EQUIPMENT", "equipment_id", "/lims/equipment"),
            new GmpTable("lab_reagent_lot", "LAB_REAGENT_LOT", "lot_number", "/lims/reagents"),
            new GmpTable("lab_reference_standard_lot", "LAB_REFERENCE_STANDARD_LOT", "lot_number", "/lims/reference-standards"),
            new GmpTable("retention_sample", "RETENTION_SAMPLE", "lot_number", "/lims/retention-samples"),
            new GmpTable("qms_deviation", "QMS_DEVIATION", "deviation_number", "/qms/deviations"),
            new GmpTable("qms_capa", "QMS_CAPA", "capa_number", "/qms/capas"),
            new GmpTable("qms_change_control", "QMS_CHANGE_CONTROL", "change_control_number", "/qms/change-controls"),
            new GmpTable("qp_batch_release", "QP_BATCH_RELEASE", "release_number", "/qms/batch-release"),
            new GmpTable("apqr", "APQR", "apqr_number", "/qms/apqr")
    );

    @Override
    public AlcoaReadinessSummary getSummary() {
        LocalDate today = LocalDate.now();
        LocalDate alertTo = today.plusDays(30);

        long openInvestigations = qcInvestigationRepository.countByStatusInAndIsActiveTrue(OPEN_INVESTIGATION_STATUSES);
        long openOosInvestigations = qcInvestigationRepository.countByStatusInAndInvestigationTypeAndIsActiveTrue(
                OPEN_INVESTIGATION_STATUSES, QcInvestigationType.OOS);
        long openOotInvestigations = qcInvestigationRepository.countByStatusInAndInvestigationTypeAndIsActiveTrue(
                OPEN_INVESTIGATION_STATUSES, QcInvestigationType.OOT);
        long ootResults = stabilityResultRepository.countByOotFlagTrueAndIsActiveTrue();
        long openEmBreaches = emResultRepository.findByActionBreachedTrueAndLinkedDeviationIdIsNullAndBreachDismissedFalseAndIsActiveTrueOrderByRecordedAtDesc().size();
        long calibrationOverdue = equipmentRepository.findByIsActiveTrueAndNextCalibrationDueBefore(today).size();
        long qualificationOverdue = equipmentRepository.findByIsActiveTrueAndNextQualificationDueBefore(today).size();
        long trainingOverdue = trainingAssignmentRepository.countByIsActiveTrueAndStatusNotAndDueDateBefore(TrainingAssignmentStatus.COMPLETED, today);
        long retentionDueDisposal = retentionSampleRepository.countOverdueDisposal(today);
        long reagentLotsExpiring = reagentLotRepository.countByExpiryDateBetweenAndIsActiveTrue(today, alertTo);
        long referenceStandardLotsExpiring = referenceStandardLotRepository.countByExpiryDateBetweenAndIsActiveTrue(today, alertTo);
        long missingMetadataCount = countMissingMetadata();
        long inactiveOrSoftDeletedCount = countInactiveOrSoftDeleted();
        long unsignedCriticalActions = countUnsignedCriticalActions();
        long auditEventsMissingReasonOrValues = countAuditEventsMissingReasonOrValues();

        long criticalGaps = openOosInvestigations + openOotInvestigations + openEmBreaches + calibrationOverdue
                + qualificationOverdue + trainingOverdue + retentionDueDisposal + missingMetadataCount
                + unsignedCriticalActions + auditEventsMissingReasonOrValues;
        int readinessScore = (int) Math.max(0, 100 - Math.min(100, criticalGaps * 10));

        return AlcoaReadinessSummary.builder()
                .missingMetadataCount(missingMetadataCount)
                .inactiveOrSoftDeletedCount(inactiveOrSoftDeletedCount)
                .openInvestigations(openInvestigations)
                .openOosInvestigations(openOosInvestigations)
                .openOotInvestigations(openOotInvestigations)
                .ootResults(ootResults)
                .openEmBreaches(openEmBreaches)
                .unsignedCriticalActions(unsignedCriticalActions)
                .calibrationOverdue(calibrationOverdue)
                .qualificationOverdue(qualificationOverdue)
                .trainingOverdue(trainingOverdue)
                .retentionDueDisposal(retentionDueDisposal)
                .reagentLotsExpiring(reagentLotsExpiring)
                .referenceStandardLotsExpiring(referenceStandardLotsExpiring)
                .auditEventsMissingReasonOrValues(auditEventsMissingReasonOrValues)
                .readinessScore(readinessScore)
                .build();
    }

    @Override
    public List<AlcoaReadinessGap> getGaps() {
        LocalDate today = LocalDate.now();
        LocalDate alertTo = today.plusDays(30);
        List<AlcoaReadinessGap> gaps = new ArrayList<>();

        qcInvestigationRepository.findFiltered(false, OPEN_INVESTIGATION_STATUSES, null, null)
                .forEach(investigation -> gaps.add(AlcoaReadinessGap.builder()
                        .category("OOS/OOT Investigation")
                        .severity(investigation.getInvestigationType() == QcInvestigationType.OOS ? "CRITICAL" : "HIGH")
                        .title(investigation.getReason())
                        .status(investigation.getStatus().name())
                        .entityType("QC_INVESTIGATION")
                        .recordId(investigation.getId())
                        .recordCode(investigation.getInvestigationNumber())
                        .owner(investigation.getOpenedBy())
                        .observedAt(investigation.getOpenedAt())
                        .route("/lims/oos-investigations")
                        .build()));

        stabilityResultRepository.findByOotFlagTrueAndIsActiveTrueOrderByEnteredAtDesc()
                .forEach(result -> gaps.add(AlcoaReadinessGap.builder()
                        .category("Stability OOT")
                        .severity("HIGH")
                        .title(result.getParameterName())
                        .status("OOT")
                        .entityType("STABILITY_RESULT")
                        .recordId(result.getId())
                        .recordCode(result.getTimepointId().toString())
                        .owner(result.getEnteredBy())
                        .observedAt(result.getEnteredAt())
                        .route("/lims/stability/" + result.getStudyId())
                        .build()));

        emResultRepository.findByActionBreachedTrueAndLinkedDeviationIdIsNullAndBreachDismissedFalseAndIsActiveTrueOrderByRecordedAtDesc()
                .forEach(result -> gaps.add(AlcoaReadinessGap.builder()
                        .category("EM Action Breach")
                        .severity("CRITICAL")
                        .title("Action breach without linked deviation")
                        .status("OPEN")
                        .entityType("EM_RESULT")
                        .recordId(result.getId())
                        .recordCode(result.getPointId().toString())
                        .owner(result.getRecordedBy())
                        .observedAt(result.getRecordedAt())
                        .route("/lims/env-monitoring")
                        .build()));

        equipmentRepository.findByIsActiveTrueAndNextCalibrationDueBefore(today)
                .forEach(equipment -> gaps.add(AlcoaReadinessGap.builder()
                        .category("Calibration")
                        .severity("CRITICAL")
                        .title(equipment.getName())
                        .status("OVERDUE")
                        .entityType("EQUIPMENT")
                        .recordId(equipment.getId())
                        .recordCode(equipment.getEquipmentId())
                        .owner(equipment.getResponsibleAnalyst())
                        .dueDate(equipment.getNextCalibrationDue())
                        .route("/lims/equipment/" + equipment.getId())
                        .build()));

        equipmentRepository.findByIsActiveTrueAndNextQualificationDueBefore(today)
                .forEach(equipment -> gaps.add(AlcoaReadinessGap.builder()
                        .category("Qualification")
                        .severity("CRITICAL")
                        .title(equipment.getName())
                        .status("OVERDUE")
                        .entityType("EQUIPMENT")
                        .recordId(equipment.getId())
                        .recordCode(equipment.getEquipmentId())
                        .owner(equipment.getResponsibleAnalyst())
                        .dueDate(equipment.getNextQualificationDue())
                        .route("/lims/equipment/" + equipment.getId())
                        .build()));

        trainingAssignmentRepository.findByIsActiveTrueAndStatusNotAndDueDateBeforeOrderByDueDateAsc(
                        TrainingAssignmentStatus.COMPLETED, today)
                .forEach(training -> gaps.add(AlcoaReadinessGap.builder()
                        .category("Training Gate")
                        .severity("HIGH")
                        .title(training.getTrainingTitle())
                        .status(training.getStatus().name())
                        .entityType("TRAINING_ASSIGNMENT")
                        .recordId(training.getId())
                        .recordCode(training.getAssignmentCode())
                        .owner(training.getAssignedUsername())
                        .dueDate(training.getDueDate())
                        .route("/hrms/training")
                        .build()));

        retentionSampleRepository.findByIsActiveTrueAndStatusAndRetentionUntilBefore(RetentionSampleStatus.STORED, today)
                .forEach(sample -> gaps.add(AlcoaReadinessGap.builder()
                        .category("Retention Disposal")
                        .severity("HIGH")
                        .title(sample.getMaterialName())
                        .status(sample.getStatus().name())
                        .entityType("RETENTION_SAMPLE")
                        .recordId(sample.getId())
                        .recordCode(sample.getLotNumber())
                        .owner(sample.getReceivedBy())
                        .dueDate(sample.getRetentionUntil())
                        .route("/lims/retention-samples/" + sample.getId())
                        .build()));

        reagentLotRepository.findByExpiryDateBetweenAndIsActiveTrueOrderByExpiryDateAsc(today, alertTo)
                .forEach(lot -> gaps.add(AlcoaReadinessGap.builder()
                        .category("Reagent Expiry")
                        .severity("MEDIUM")
                        .title(lot.getSupplier())
                        .status(lot.getStatus())
                        .entityType("LAB_REAGENT_LOT")
                        .recordId(lot.getId())
                        .recordCode(lot.getLotNumber())
                        .dueDate(lot.getExpiryDate())
                        .route("/lims/reagents")
                        .build()));

        referenceStandardLotRepository.findByExpiryDateBetweenAndIsActiveTrueOrderByExpiryDateAsc(today, alertTo)
                .forEach(lot -> gaps.add(AlcoaReadinessGap.builder()
                        .category("Reference Standard Expiry")
                        .severity("MEDIUM")
                        .title("Reference standard lot")
                        .status(lot.getStatus())
                        .entityType("LAB_REFERENCE_STANDARD_LOT")
                        .recordId(lot.getId())
                        .recordCode(lot.getLotNumber())
                        .dueDate(lot.getExpiryDate())
                        .route("/lims/reference-standards")
                        .build()));

        addMetadataGaps(gaps);
        addInactiveOrSoftDeletedGaps(gaps);
        addUnsignedCriticalActionGaps(gaps);
        addAuditCompletenessGaps(gaps);

        return gaps.stream()
                .sorted(Comparator
                        .comparingInt((AlcoaReadinessGap gap) -> severityRank(gap.getSeverity()))
                        .thenComparing(AlcoaReadinessGap::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(AlcoaReadinessGap::getObservedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Override
    public byte[] exportCsv() {
        StringBuilder csv = new StringBuilder("severity,category,entityType,recordId,recordCode,status,owner,dueDate,observedAt,route,title\n");
        getGaps().forEach(gap -> csv.append(csv(gap.getSeverity())).append(',')
                .append(csv(gap.getCategory())).append(',')
                .append(csv(gap.getEntityType())).append(',')
                .append(csv(gap.getRecordId())).append(',')
                .append(csv(gap.getRecordCode())).append(',')
                .append(csv(gap.getStatus())).append(',')
                .append(csv(gap.getOwner())).append(',')
                .append(csv(gap.getDueDate())).append(',')
                .append(csv(gap.getObservedAt())).append(',')
                .append(csv(gap.getRoute())).append(',')
                .append(csv(gap.getTitle())).append('\n'));
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private long countMissingMetadata() {
        return GMP_TABLES.stream().mapToLong(table -> countRows(table.tableName(), metadataWhere(table.tableName()))).sum();
    }

    private long countInactiveOrSoftDeleted() {
        return GMP_TABLES.stream().mapToLong(table -> countRows(table.tableName(), inactiveWhere(table.tableName()))).sum();
    }

    private long countUnsignedCriticalActions() {
        if (!tableExists("audit_event") || !tableExists("e_signature_record")) {
            return 0;
        }
        String sql = """
                select count(*) from audit_event ae
                where ae.is_active = true
                  and ae.event_type in ('STATUS_CHANGE', 'WORKFLOW_ACTION')
                  and upper(coalesce(ae.field_name, '')) in ('STATUS', 'APPROVALSTATUS', 'EFFECTIVENESSOUTCOME', 'DISPOSITION')
                  and not exists (
                    select 1 from e_signature_record es
                    where es.entity_type = ae.entity_type
                      and es.entity_id = ae.entity_id
                      and es.is_active = true
                  )
                """;
        return queryCount(sql);
    }

    private long countAuditEventsMissingReasonOrValues() {
        if (!tableExists("audit_event")) {
            return 0;
        }
        String sql = """
                select count(*) from audit_event
                where is_active = true
                  and event_type in ('UPDATE', 'STATUS_CHANGE', 'WORKFLOW_ACTION', 'E_SIGNATURE')
                  and (old_value is null or new_value is null or reason is null or trim(reason) = '')
                """;
        return queryCount(sql);
    }

    private void addMetadataGaps(List<AlcoaReadinessGap> gaps) {
        for (GmpTable table : GMP_TABLES) {
            String where = metadataWhere(table.tableName());
            if (where == null) {
                continue;
            }
            sampleRows(table, where, 10).forEach(row -> gaps.add(genericGap(table, row, "Missing Metadata", "HIGH",
                    "Created/updated actor-time metadata incomplete", "OPEN")));
        }
    }

    private void addInactiveOrSoftDeletedGaps(List<AlcoaReadinessGap> gaps) {
        for (GmpTable table : GMP_TABLES) {
            String where = inactiveWhere(table.tableName());
            if (where == null) {
                continue;
            }
            sampleRows(table, where, 10).forEach(row -> gaps.add(genericGap(table, row, "Inactive/Soft Deleted Record", "MEDIUM",
                    "Inactive GMP record requires retention/audit review", "INACTIVE")));
        }
    }

    private void addUnsignedCriticalActionGaps(List<AlcoaReadinessGap> gaps) {
        if (!tableExists("audit_event") || !tableExists("e_signature_record")) {
            return;
        }
        String sql = """
                select ae.id, ae.entity_type, ae.entity_id, ae.field_name, ae.actor, ae.event_at
                from audit_event ae
                where ae.is_active = true
                  and ae.event_type in ('STATUS_CHANGE', 'WORKFLOW_ACTION')
                  and upper(coalesce(ae.field_name, '')) in ('STATUS', 'APPROVALSTATUS', 'EFFECTIVENESSOUTCOME', 'DISPOSITION')
                  and not exists (
                    select 1 from e_signature_record es
                    where es.entity_type = ae.entity_type
                      and es.entity_id = ae.entity_id
                      and es.is_active = true
                  )
                order by ae.event_at desc
                limit 25
                """;
        jdbcTemplate.queryForList(sql).forEach(row -> gaps.add(AlcoaReadinessGap.builder()
                .category("Unsigned Critical Action")
                .severity("CRITICAL")
                .title("Critical " + row.get("FIELD_NAME") + " action has no linked e-signature")
                .status("UNSIGNED")
                .entityType(stringValue(row.get("ENTITY_TYPE")))
                .recordId(asUuid(row.get("ENTITY_ID")))
                .recordCode(asUuid(row.get("ENTITY_ID")).toString())
                .owner(stringValue(row.get("ACTOR")))
                .observedAt(asLocalDateTime(row.get("EVENT_AT")))
                .route(routeForEntity(stringValue(row.get("ENTITY_TYPE")), asUuid(row.get("ENTITY_ID"))))
                .build()));
    }

    private void addAuditCompletenessGaps(List<AlcoaReadinessGap> gaps) {
        if (!tableExists("audit_event")) {
            return;
        }
        String sql = """
                select id, entity_type, entity_id, field_name, actor, event_at
                from audit_event
                where is_active = true
                  and event_type in ('UPDATE', 'STATUS_CHANGE', 'WORKFLOW_ACTION', 'E_SIGNATURE')
                  and (old_value is null or new_value is null or reason is null or trim(reason) = '')
                order by event_at desc
                limit 25
                """;
        jdbcTemplate.queryForList(sql).forEach(row -> gaps.add(AlcoaReadinessGap.builder()
                .category("Audit Completeness")
                .severity("MEDIUM")
                .title("Audit event missing reason or old/new value evidence")
                .status("REVIEW")
                .entityType(stringValue(row.get("ENTITY_TYPE")))
                .recordId(asUuid(row.get("ENTITY_ID")))
                .recordCode(asUuid(row.get("ENTITY_ID")).toString())
                .owner(stringValue(row.get("ACTOR")))
                .observedAt(asLocalDateTime(row.get("EVENT_AT")))
                .route(routeForEntity(stringValue(row.get("ENTITY_TYPE")), asUuid(row.get("ENTITY_ID"))))
                .build()));
    }

    private AlcoaReadinessGap genericGap(GmpTable table, Map<String, Object> row, String category, String severity, String title, String status) {
        UUID id = asUuid(row.get("ID"));
        return AlcoaReadinessGap.builder()
                .category(category)
                .severity(severity)
                .title(title)
                .status(status)
                .entityType(table.entityType())
                .recordId(id)
                .recordCode(stringValue(row.get("RECORD_CODE")) != null ? stringValue(row.get("RECORD_CODE")) : id.toString())
                .route(routeFor(table, id))
                .build();
    }

    private List<Map<String, Object>> sampleRows(GmpTable table, String where, int limit) {
        String codeSelect = hasColumn(table.tableName(), table.codeColumn()) ? table.codeColumn() : "id";
        String sql = "select id, " + codeSelect + " as record_code from " + table.tableName() + " where " + where + " limit " + limit;
        return jdbcTemplate.queryForList(sql);
    }

    private String metadataWhere(String tableName) {
        if (!tableExists(tableName) || !hasColumn(tableName, "id")) {
            return null;
        }
        List<String> clauses = new ArrayList<>();
        if (hasColumn(tableName, "created_by")) clauses.add("(created_by is null or trim(created_by) = '')");
        if (hasColumn(tableName, "created_at")) clauses.add("created_at is null");
        if (hasColumn(tableName, "updated_by") && hasColumn(tableName, "updated_at")) {
            clauses.add("(updated_at is not null and (updated_by is null or trim(updated_by) = ''))");
        }
        if (clauses.isEmpty()) {
            return null;
        }
        return String.join(" or ", clauses);
    }

    private String inactiveWhere(String tableName) {
        if (!tableExists(tableName) || !hasColumn(tableName, "id") || !hasColumn(tableName, "is_active")) {
            return null;
        }
        return "is_active = false";
    }

    private long countRows(String tableName, String where) {
        if (where == null) {
            return 0;
        }
        return queryCount("select count(*) from " + tableName + " where " + where);
    }

    private long queryCount(String sql) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class);
        return value != null ? value : 0;
    }

    private boolean tableExists(String tableName) {
        String sql = """
                select count(*) from information_schema.tables
                where lower(table_name) = ?
                """;
        return queryCount(sql, tableName.toLowerCase(Locale.ROOT)) > 0;
    }

    private boolean hasColumn(String tableName, String columnName) {
        if (columnName == null) {
            return false;
        }
        String sql = """
                select count(*) from information_schema.columns
                where lower(table_name) = ? and lower(column_name) = ?
                """;
        return queryCount(sql, tableName.toLowerCase(Locale.ROOT), columnName.toLowerCase(Locale.ROOT)) > 0;
    }

    private long queryCount(String sql, Object... args) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, args);
        return value != null ? value : 0;
    }

    private UUID asUuid(Object value) {
        if (value instanceof UUID uuid) {
            return uuid;
        }
        return UUID.fromString(String.valueOf(value));
    }

    private LocalDateTime asLocalDateTime(Object value) {
        return value instanceof LocalDateTime localDateTime ? localDateTime : null;
    }

    private String stringValue(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private String routeFor(GmpTable table, UUID id) {
        return switch (table.entityType()) {
            case "STABILITY_STUDY" -> table.routePrefix() + "/" + id;
            case "EQUIPMENT" -> table.routePrefix() + "/" + id;
            case "RETENTION_SAMPLE" -> table.routePrefix() + "/" + id;
            default -> table.routePrefix();
        };
    }

    private String routeForEntity(String entityType, UUID id) {
        return GMP_TABLES.stream()
                .filter(table -> table.entityType().equals(entityType))
                .findFirst()
                .map(table -> routeFor(table, id))
                .orElse("/lims/compliance");
    }

    private String csv(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value).replace("\"", "\"\"");
        return "\"" + text + "\"";
    }

    private int severityRank(String severity) {
        return switch (severity) {
            case "CRITICAL" -> 0;
            case "HIGH" -> 1;
            case "MEDIUM" -> 2;
            default -> 3;
        };
    }
}
