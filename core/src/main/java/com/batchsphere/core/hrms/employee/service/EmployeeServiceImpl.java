package com.batchsphere.core.hrms.employee.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.hrms.employee.dto.EmployeeRequest;
import com.batchsphere.core.hrms.employee.dto.EmployeeResponse;
import com.batchsphere.core.hrms.employee.entity.Employee;
import com.batchsphere.core.hrms.employee.entity.EmployeeQualificationStatus;
import com.batchsphere.core.hrms.employee.entity.EmployeeStatus;
import com.batchsphere.core.hrms.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    @Transactional
    public EmployeeResponse createEmployee(EmployeeRequest request) {
        String employeeCode = normalizeRequired(request.getEmployeeCode(), "Employee code is required").toUpperCase();
        String email = normalizeEmail(request.getEmail());
        if (employeeRepository.existsByEmployeeCodeIgnoreCaseAndIsActiveTrue(employeeCode)) {
            throw new DuplicateResourceException("Employee code already exists: " + employeeCode);
        }
        if (email != null && employeeRepository.existsByEmailIgnoreCaseAndIsActiveTrue(email)) {
            throw new DuplicateResourceException("Employee email already exists: " + email);
        }
        validateManager(request.getManagerEmployeeId(), null);

        String actor = firstNonBlank(request.getCreatedBy(), authenticatedActorService.currentActor());
        Employee employee = Employee.builder()
                .id(UUID.randomUUID())
                .employeeCode(employeeCode)
                .fullName(normalizeRequired(request.getFullName(), "Full name is required"))
                .email(email)
                .phone(blankToNull(request.getPhone()))
                .department(normalizeRequired(request.getDepartment(), "Department is required"))
                .site(blankToNull(request.getSite()))
                .jobTitle(normalizeRequired(request.getJobTitle(), "Job title is required"))
                .managerEmployeeId(request.getManagerEmployeeId())
                .employmentStatus(request.getEmploymentStatus() == null ? EmployeeStatus.ACTIVE : request.getEmploymentStatus())
                .qualificationStatus(request.getQualificationStatus() == null ? EmployeeQualificationStatus.PENDING : request.getQualificationStatus())
                .joinedOn(request.getJoinedOn())
                .lastTrainingDate(request.getLastTrainingDate())
                .nextTrainingDue(request.getNextTrainingDue())
                .remarks(blankToNull(request.getRemarks()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();
        return toResponse(employeeRepository.save(employee), managerMap());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeResponse> getEmployees(Boolean includeInactive) {
        List<Employee> employees = Boolean.TRUE.equals(includeInactive)
                ? employeeRepository.findAll()
                : employeeRepository.findByIsActiveTrueOrderByEmployeeCodeAsc();
        Map<UUID, Employee> managers = managerMap();
        return employees.stream()
                .sorted(Comparator.comparing(Employee::getEmployeeCode, String.CASE_INSENSITIVE_ORDER))
                .map(employee -> toResponse(employee, managers))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponse getEmployee(UUID id) {
        return toResponse(getActiveEmployee(id), managerMap());
    }

    @Override
    @Transactional
    public EmployeeResponse updateEmployee(UUID id, EmployeeRequest request) {
        Employee employee = getActiveEmployee(id);
        String employeeCode = normalizeRequired(request.getEmployeeCode(), "Employee code is required").toUpperCase();
        String email = normalizeEmail(request.getEmail());
        employeeRepository.findByEmployeeCodeIgnoreCaseAndIsActiveTrue(employeeCode)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Employee code already exists: " + employeeCode);
                });
        if (email != null) {
            employeeRepository.findAll().stream()
                    .filter(existing -> Boolean.TRUE.equals(existing.getIsActive()))
                    .filter(existing -> email.equalsIgnoreCase(existing.getEmail()))
                    .filter(existing -> !existing.getId().equals(id))
                    .findFirst()
                    .ifPresent(existing -> {
                        throw new DuplicateResourceException("Employee email already exists: " + email);
                    });
        }
        validateManager(request.getManagerEmployeeId(), id);

        employee.setEmployeeCode(employeeCode);
        employee.setFullName(normalizeRequired(request.getFullName(), "Full name is required"));
        employee.setEmail(email);
        employee.setPhone(blankToNull(request.getPhone()));
        employee.setDepartment(normalizeRequired(request.getDepartment(), "Department is required"));
        employee.setSite(blankToNull(request.getSite()));
        employee.setJobTitle(normalizeRequired(request.getJobTitle(), "Job title is required"));
        employee.setManagerEmployeeId(request.getManagerEmployeeId());
        employee.setEmploymentStatus(request.getEmploymentStatus() == null ? EmployeeStatus.ACTIVE : request.getEmploymentStatus());
        employee.setQualificationStatus(request.getQualificationStatus() == null ? EmployeeQualificationStatus.PENDING : request.getQualificationStatus());
        employee.setJoinedOn(request.getJoinedOn());
        employee.setLastTrainingDate(request.getLastTrainingDate());
        employee.setNextTrainingDue(request.getNextTrainingDue());
        employee.setRemarks(blankToNull(request.getRemarks()));
        employee.setUpdatedBy(firstNonBlank(request.getUpdatedBy(), authenticatedActorService.currentActor()));
        employee.setUpdatedAt(LocalDateTime.now());
        return toResponse(employeeRepository.save(employee), managerMap());
    }

    @Override
    @Transactional
    public void deactivateEmployee(UUID id, String updatedBy) {
        Employee employee = getActiveEmployee(id);
        employee.setIsActive(false);
        employee.setEmploymentStatus(EmployeeStatus.INACTIVE);
        employee.setUpdatedBy(firstNonBlank(updatedBy, authenticatedActorService.currentActor()));
        employee.setUpdatedAt(LocalDateTime.now());
        employeeRepository.save(employee);
    }

    private Employee getActiveEmployee(UUID id) {
        return employeeRepository.findById(id)
                .filter(employee -> Boolean.TRUE.equals(employee.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));
    }

    private void validateManager(UUID managerEmployeeId, UUID currentEmployeeId) {
        if (managerEmployeeId == null) {
            return;
        }
        if (managerEmployeeId.equals(currentEmployeeId)) {
            throw new BusinessConflictException("Employee cannot be their own manager");
        }
        getActiveEmployee(managerEmployeeId);
    }

    private Map<UUID, Employee> managerMap() {
        return employeeRepository.findAll().stream()
                .collect(Collectors.toMap(Employee::getId, Function.identity(), (left, right) -> left));
    }

    private EmployeeResponse toResponse(Employee employee, Map<UUID, Employee> managers) {
        Employee manager = employee.getManagerEmployeeId() == null ? null : managers.get(employee.getManagerEmployeeId());
        return EmployeeResponse.builder()
                .id(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .fullName(employee.getFullName())
                .email(employee.getEmail())
                .phone(employee.getPhone())
                .department(employee.getDepartment())
                .site(employee.getSite())
                .jobTitle(employee.getJobTitle())
                .managerEmployeeId(employee.getManagerEmployeeId())
                .managerEmployeeCode(manager == null ? null : manager.getEmployeeCode())
                .managerName(manager == null ? null : manager.getFullName())
                .employmentStatus(employee.getEmploymentStatus())
                .qualificationStatus(employee.getQualificationStatus())
                .joinedOn(employee.getJoinedOn())
                .lastTrainingDate(employee.getLastTrainingDate())
                .nextTrainingDue(employee.getNextTrainingDue())
                .remarks(employee.getRemarks())
                .isActive(employee.getIsActive())
                .createdBy(employee.getCreatedBy())
                .createdAt(employee.getCreatedAt())
                .updatedBy(employee.getUpdatedBy())
                .updatedAt(employee.getUpdatedAt())
                .build();
    }

    private String normalizeRequired(String value, String message) {
        String normalized = blankToNull(value);
        if (normalized == null) {
            throw new BusinessConflictException(message);
        }
        return normalized;
    }

    private String normalizeEmail(String email) {
        String normalized = blankToNull(email);
        return normalized == null ? null : normalized.toLowerCase();
    }

    private String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private String firstNonBlank(String first, String fallback) {
        String normalized = blankToNull(first);
        return normalized == null ? fallback : normalized;
    }
}
