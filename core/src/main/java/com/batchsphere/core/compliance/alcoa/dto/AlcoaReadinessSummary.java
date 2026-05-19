package com.batchsphere.core.compliance.alcoa.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AlcoaReadinessSummary {
    long missingMetadataCount;
    long inactiveOrSoftDeletedCount;
    long openInvestigations;
    long openOosInvestigations;
    long openOotInvestigations;
    long ootResults;
    long openEmBreaches;
    long unsignedCriticalActions;
    long calibrationOverdue;
    long qualificationOverdue;
    long trainingOverdue;
    long retentionDueDisposal;
    long reagentLotsExpiring;
    long referenceStandardLotsExpiring;
    long auditEventsMissingReasonOrValues;
    int readinessScore;
}
