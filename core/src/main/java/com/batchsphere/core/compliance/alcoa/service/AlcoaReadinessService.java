package com.batchsphere.core.compliance.alcoa.service;

import com.batchsphere.core.compliance.alcoa.dto.AlcoaReadinessSummary;
import com.batchsphere.core.compliance.alcoa.dto.AlcoaReadinessGap;

import java.util.List;

public interface AlcoaReadinessService {
    AlcoaReadinessSummary getSummary();

    List<AlcoaReadinessGap> getGaps();

    byte[] exportCsv();
}
