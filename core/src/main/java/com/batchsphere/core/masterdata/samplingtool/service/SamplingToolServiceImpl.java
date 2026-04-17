package com.batchsphere.core.masterdata.samplingtool.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
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
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public SamplingTool createSamplingTool(SamplingToolRequest request) {
        String actor = authenticatedActorService.currentActor();
        if (samplingToolRepository.existsByToolCode(request.getToolCode().trim())) {
            throw new DuplicateResourceException("Sampling tool code already exists: " + request.getToolCode());
        }

        SamplingTool tool = SamplingTool.builder()
                .id(UUID.randomUUID())
                .toolCode(request.getToolCode().trim())
                .toolName(request.getToolName().trim())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        return samplingToolRepository.save(tool);
    }

    @Override
    public SamplingTool getSamplingToolById(UUID id) {
        return samplingToolRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling tool not found with id: " + id));
    }

    @Override
    public List<SamplingTool> getAllSamplingTools() {
        return samplingToolRepository.findByIsActiveTrueOrderByToolCodeAsc();
    }

    @Override
    public SamplingTool updateSamplingTool(UUID id, SamplingToolRequest request) {
        String actor = authenticatedActorService.currentActor();
        SamplingTool tool = getSamplingToolById(id);
        String toolCode = request.getToolCode().trim();

        if (!tool.getToolCode().equals(toolCode) && samplingToolRepository.existsByToolCode(toolCode)) {
            throw new DuplicateResourceException("Sampling tool code already exists: " + request.getToolCode());
        }

        tool.setToolCode(toolCode);
        tool.setToolName(request.getToolName().trim());
        tool.setDescription(request.getDescription());
        tool.setUpdatedBy(actor);
        tool.setUpdatedAt(LocalDateTime.now());

        return samplingToolRepository.save(tool);
    }

    @Override
    public void deactivateSamplingTool(UUID id) {
        String actor = authenticatedActorService.currentActor();
        SamplingTool tool = getSamplingToolById(id);
        tool.setIsActive(false);
        tool.setUpdatedBy(actor);
        tool.setUpdatedAt(LocalDateTime.now());
        samplingToolRepository.save(tool);
    }
}
