package com.batchsphere.core.masterdata.quality.dto;

import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import lombok.Data;

@Data
public class ReviewSubmissionRequest {
    private ReviewRoute reviewRoute;
}
