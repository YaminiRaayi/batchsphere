package com.batchsphere.core.masterdata.moa.service;

import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.masterdata.moa.dto.MoaRequest;
import com.batchsphere.core.masterdata.moa.entity.Moa;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MoaServiceImpl implements MoaService {

    private final MoaRepository moaRepository;

    @Override
    public Moa createMoa(MoaRequest request) {
        if (moaRepository.existsByMoaCode(request.getMoaCode().trim())) {
            throw new DuplicateResourceException("MoA code already exists: " + request.getMoaCode());
        }

        Moa moa = Moa.builder()
                .id(UUID.randomUUID())
                .moaCode(request.getMoaCode().trim())
                .moaName(request.getMoaName().trim())
                .revision(request.getRevision())
                .referenceAttachment(request.getReferenceAttachment())
                .isActive(true)
                .createdBy(request.getCreatedBy().trim())
                .createdAt(LocalDateTime.now())
                .build();

        return moaRepository.save(moa);
    }

    @Override
    public List<Moa> getAllMoas() {
        return moaRepository.findByIsActiveTrueOrderByMoaCodeAsc();
    }
}
