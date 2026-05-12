package com.batchsphere.core.hrms.employee.repository;

import com.batchsphere.core.hrms.employee.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    boolean existsByEmployeeCodeIgnoreCaseAndIsActiveTrue(String employeeCode);

    boolean existsByEmailIgnoreCaseAndIsActiveTrue(String email);

    Optional<Employee> findByEmployeeCodeIgnoreCaseAndIsActiveTrue(String employeeCode);

    List<Employee> findByIsActiveTrueOrderByEmployeeCodeAsc();
}
