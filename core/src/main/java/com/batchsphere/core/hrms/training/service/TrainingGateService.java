package com.batchsphere.core.hrms.training.service;

public interface TrainingGateService {
    void assertTrainedForRequirement(String username, String requirementKey);
}
