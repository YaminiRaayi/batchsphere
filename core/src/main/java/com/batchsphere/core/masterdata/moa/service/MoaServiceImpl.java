package com.batchsphere.core.masterdata.moa.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
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
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public Moa createMoa(MoaRequest request) {
        String actor = authenticatedActorService.currentActor();
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
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        return moaRepository.save(moa);
    }

    @Override
    public Moa getMoaById(UUID id) {
        return moaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MoA not found with id: " + id));
    }

    @Override
    public List<Moa> getAllMoas() {
        return moaRepository.findByIsActiveTrueOrderByMoaCodeAsc();
    }

    @Override
    public Moa updateMoa(UUID id, MoaRequest request) {
        String actor = authenticatedActorService.currentActor();
        Moa moa = getMoaById(id);
        String moaCode = request.getMoaCode().trim();

        if (!moa.getMoaCode().equals(moaCode) && moaRepository.existsByMoaCode(moaCode)) {
            throw new DuplicateResourceException("MoA code already exists: " + request.getMoaCode());
        }

        moa.setMoaCode(moaCode);
        moa.setMoaName(request.getMoaName().trim());
        moa.setRevision(request.getRevision());
        moa.setReferenceAttachment(request.getReferenceAttachment());
        moa.setUpdatedBy(actor);
        moa.setUpdatedAt(LocalDateTime.now());

        return moaRepository.save(moa);
    }

    @Override
    public void deactivateMoa(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Moa moa = getMoaById(id);
        moa.setIsActive(false);
        moa.setUpdatedBy(actor);
        moa.setUpdatedAt(LocalDateTime.now());
        moaRepository.save(moa);
    }
}
