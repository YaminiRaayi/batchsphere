package com.batchsphere.core.masterdata.spec.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import com.batchsphere.core.masterdata.spec.dto.SpecParameterRequest;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.entity.SpecStatus;
import com.batchsphere.core.masterdata.spec.repository.SpecParameterRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SpecParameterServiceImpl implements SpecParameterService {

    private final SpecParameterRepository specParameterRepository;
    private final SpecRepository specRepository;
    private final MoaRepository moaRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    @Transactional
    public SpecParameter createParameter(UUID specId, SpecParameterRequest request) {
        String actor = authenticatedActorService.currentActor();
        Spec spec = getEditableSpec(specId);
        validateMoaIfPresent(request.getMoaId());
        validateCriteria(request);

        SpecParameter parameter = SpecParameter.builder()
                .id(UUID.randomUUID())
                .specId(spec.getId())
                .parameterName(request.getParameterName().trim())
                .testType(request.getTestType())
                .moaId(request.getMoaId())
                .criteriaType(request.getCriteriaType())
                .lowerLimit(request.getLowerLimit())
                .upperLimit(request.getUpperLimit())
                .textCriteria(trimToNull(request.getTextCriteria()))
                .compendialChapterRef(trimToNull(request.getCompendialChapterRef()))
                .unit(trimToNull(request.getUnit()))
                .isMandatory(request.getIsMandatory())
                .sequence(request.getSequence())
                .notes(trimToNull(request.getNotes()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();
        return specParameterRepository.save(parameter);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SpecParameter> getParameters(UUID specId) {
        ensureSpecExists(specId);
        return specParameterRepository.findBySpecIdAndIsActiveTrueOrderBySequenceAsc(specId);
    }

    @Override
    @Transactional
    public SpecParameter updateParameter(UUID specId, UUID parameterId, SpecParameterRequest request) {
        String actor = authenticatedActorService.currentActor();
        getEditableSpec(specId);
        SpecParameter parameter = getActiveParameter(specId, parameterId);
        validateMoaIfPresent(request.getMoaId());
        validateCriteria(request);

        parameter.setParameterName(request.getParameterName().trim());
        parameter.setTestType(request.getTestType());
        parameter.setMoaId(request.getMoaId());
        parameter.setCriteriaType(request.getCriteriaType());
        parameter.setLowerLimit(request.getLowerLimit());
        parameter.setUpperLimit(request.getUpperLimit());
        parameter.setTextCriteria(trimToNull(request.getTextCriteria()));
        parameter.setCompendialChapterRef(trimToNull(request.getCompendialChapterRef()));
        parameter.setUnit(trimToNull(request.getUnit()));
        parameter.setIsMandatory(request.getIsMandatory());
        parameter.setSequence(request.getSequence());
        parameter.setNotes(trimToNull(request.getNotes()));
        parameter.setUpdatedBy(actor);
        parameter.setUpdatedAt(LocalDateTime.now());
        return specParameterRepository.save(parameter);
    }

    @Override
    @Transactional
    public void deleteParameter(UUID specId, UUID parameterId) {
        String actor = authenticatedActorService.currentActor();
        getEditableSpec(specId);
        SpecParameter parameter = getActiveParameter(specId, parameterId);
        parameter.setIsActive(false);
        parameter.setUpdatedBy(actor);
        parameter.setUpdatedAt(LocalDateTime.now());
        specParameterRepository.save(parameter);
    }

    private Spec getEditableSpec(UUID specId) {
        Spec spec = ensureSpecExists(specId);
        if (!Boolean.TRUE.equals(spec.getIsActive()) || spec.getStatus() != SpecStatus.DRAFT) {
            throw new BusinessConflictException("Spec parameters can only be changed on active DRAFT specs");
        }
        return spec;
    }

    private Spec ensureSpecExists(UUID specId) {
        return specRepository.findById(specId)
                .orElseThrow(() -> new ResourceNotFoundException("Spec not found with id: " + specId));
    }

    private SpecParameter getActiveParameter(UUID specId, UUID parameterId) {
        SpecParameter parameter = specParameterRepository.findById(parameterId)
                .orElseThrow(() -> new ResourceNotFoundException("Spec parameter not found with id: " + parameterId));
        if (!parameter.getSpecId().equals(specId) || !Boolean.TRUE.equals(parameter.getIsActive())) {
            throw new ResourceNotFoundException("Spec parameter not found with id: " + parameterId);
        }
        return parameter;
    }

    private void validateMoaIfPresent(UUID moaId) {
        if (moaId == null) {
            return;
        }
        moaRepository.findById(moaId)
                .orElseThrow(() -> new ResourceNotFoundException("MoA not found with id: " + moaId));
    }

    private void validateCriteria(SpecParameterRequest request) {
        switch (request.getCriteriaType()) {
            case NLT -> {
                if (request.getLowerLimit() == null) {
                    throw new BusinessConflictException("lowerLimit is required for NLT criteria");
                }
            }
            case NMT -> {
                if (request.getUpperLimit() == null) {
                    throw new BusinessConflictException("upperLimit is required for NMT criteria");
                }
            }
            case RANGE -> {
                if (request.getLowerLimit() == null || request.getUpperLimit() == null) {
                    throw new BusinessConflictException("Both lowerLimit and upperLimit are required for RANGE criteria");
                }
            }
            case PASS_FAIL, COMPLIES, TEXT -> {
                if (!StringUtils.hasText(request.getTextCriteria())) {
                    throw new BusinessConflictException("textCriteria is required for text-based criteria");
                }
            }
        }
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
