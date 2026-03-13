package com.batchsphere.core.batch.entity;

public enum BatchStatus {
    CREATED,
    QUARANTINE,
    UNDER_TEST,
    QC_APPROVED,
    QA_RELEASED,
    REJECTED,
    EXPIRED
}
