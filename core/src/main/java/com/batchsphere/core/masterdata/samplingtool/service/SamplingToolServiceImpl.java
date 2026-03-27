package com.batchsphere.core.masterdata.samplingtool.service;

import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.masterdata.samplingtool.dto.SamplingToolRequest;
import com.batchsphere.core.masterdata.samplingtool.entity.SamplingTool;
import com.batchsphere.core.masterdata.samplingtool.repository.SamplingToolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SamplingToolServiceImpl implements SamplingToolService {

    private final SamplingToolRepository samplingToolRepository;

    @Override
    public SamplingTool createSamplingTool(SamplingToolRequest request) {
        if (samplingToolRepository.existsByToolCode(request.getToolCode().trim())) {
            throw new DuplicateResourceException("Sampling tool code already exists: " + request.getToolCode());
        }

        SamplingTool tool = SamplingTool.builder()
                .id(UUID.randomUUID())
                .toolCode(request.getToolCode().trim())
                .toolName(request.getToolName().trim())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(request.getCreatedBy().trim())
                .createdAt(LocalDateTime.now())
                .build();

        return samplingToolRepository.save(tool);
    }

    @Override
    public List<SamplingTool> getAllSamplingTools() {
        return samplingToolRepository.findByIsActiveTrueOrderByToolCodeAsc();
    }
}
