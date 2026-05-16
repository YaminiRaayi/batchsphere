package com.batchsphere.core.qms.analytics;

import com.batchsphere.core.hrms.employee.entity.Employee;
import com.batchsphere.core.hrms.employee.entity.EmployeeQualificationStatus;
import com.batchsphere.core.hrms.employee.entity.EmployeeStatus;
import com.batchsphere.core.hrms.employee.repository.EmployeeRepository;
import com.batchsphere.core.hrms.training.entity.TrainingAssignment;
import com.batchsphere.core.hrms.training.entity.TrainingAssignmentStatus;
import com.batchsphere.core.hrms.training.entity.TrainingType;
import com.batchsphere.core.hrms.training.repository.TrainingAssignmentRepository;
import com.batchsphere.core.qms.capa.entity.Capa;
import com.batchsphere.core.qms.capa.entity.CapaApprovalStatus;
import com.batchsphere.core.qms.capa.entity.CapaEffectivenessOutcome;
import com.batchsphere.core.qms.capa.entity.CapaStatus;
import com.batchsphere.core.qms.capa.repository.CapaRepository;
import com.batchsphere.core.qms.changecontrol.entity.ChangeControl;
import com.batchsphere.core.qms.changecontrol.entity.ChangeControlRisk;
import com.batchsphere.core.qms.changecontrol.entity.ChangeControlStatus;
import com.batchsphere.core.qms.changecontrol.entity.ChangeControlType;
import com.batchsphere.core.qms.changecontrol.repository.ChangeControlRepository;
import com.batchsphere.core.qms.deviation.entity.Deviation;
import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
import com.batchsphere.core.qms.deviation.entity.DeviationSourceModule;
import com.batchsphere.core.qms.deviation.entity.DeviationStatus;
import com.batchsphere.core.qms.deviation.entity.DeviationType;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
import com.batchsphere.core.qms.document.entity.ControlledDocument;
import com.batchsphere.core.qms.document.entity.ControlledDocumentStatus;
import com.batchsphere.core.qms.document.entity.ControlledDocumentType;
import com.batchsphere.core.qms.document.repository.ControlledDocumentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class QmsAnalyticsControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;
    @Autowired
    private ChangeControlRepository changeControlRepository;
    @Autowired
    private CapaRepository capaRepository;
    @Autowired
    private DeviationRepository deviationRepository;
    @Autowired
    private ControlledDocumentRepository documentRepository;
    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private TrainingAssignmentRepository trainingAssignmentRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void analyticsEndpointReturnsComplianceKpiCounts() throws Exception {
        String token = loginAsAdmin();
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        changeControlRepository.save(ChangeControl.builder()
                .id(UUID.randomUUID())
                .changeControlNumber("CC-KPI-" + suffix)
                .title("Open change control KPI")
                .changeType(ChangeControlType.PROCESS)
                .reason("Dashboard KPI validation")
                .riskClassification(ChangeControlRisk.MEDIUM)
                .status(ChangeControlStatus.UNDER_REVIEW)
                .isActive(true)
                .createdBy("test")
                .createdAt(now)
                .build());

        UUID deviationId = UUID.randomUUID();
        deviationRepository.save(Deviation.builder()
                .id(deviationId)
                .deviationNumber("DEV-KPI-" + suffix)
                .title("Deviation for CAPA KPI")
                .description("Deviation backing CAPA analytics test")
                .deviationType(DeviationType.PROCESS)
                .severity(DeviationSeverity.MAJOR)
                .status(DeviationStatus.CAPA_IN_PROGRESS)
                .sourceModule(DeviationSourceModule.MANUAL)
                .sourceReference("KPI-" + suffix)
                .detectedBy("test")
                .detectedAt(now)
                .isActive(true)
                .createdBy("test")
                .createdAt(now)
                .build());

        capaRepository.save(Capa.builder()
                .id(UUID.randomUUID())
                .capaNumber("CAPA-KPI-" + suffix)
                .deviationId(deviationId)
                .title("Overdue effectiveness KPI")
                .severity(DeviationSeverity.MAJOR)
                .status(CapaStatus.EFFECTIVENESS_CHECK)
                .approvalStatus(CapaApprovalStatus.APPROVED)
                .owner("admin")
                .dueDate(today.minusDays(5))
                .correctiveAction("Correct the documented process failure and attach objective evidence.")
                .effectivenessOutcome(CapaEffectivenessOutcome.PENDING)
                .effectivenessReviewDate(today.minusDays(1))
                .isActive(true)
                .createdBy("test")
                .createdAt(now.minusDays(10))
                .build());

        documentRepository.save(ControlledDocument.builder()
                .id(UUID.randomUUID())
                .documentNumber("DOC-KPI-" + suffix)
                .title("SOP due for review")
                .documentType(ControlledDocumentType.SOP)
                .department("Quality")
                .status(ControlledDocumentStatus.EFFECTIVE)
                .reviewCycleMonths(24)
                .nextReviewDate(today)
                .effectiveDate(today.minusYears(2))
                .isActive(true)
                .createdBy("test")
                .createdAt(now)
                .build());

        UUID employeeId = UUID.randomUUID();
        employeeRepository.save(Employee.builder()
                .id(employeeId)
                .employeeCode("EMP-KPI-" + suffix)
                .fullName("Training KPI User")
                .email("kpi-" + suffix + "@batchsphere.local")
                .department("Quality")
                .jobTitle("QC Analyst")
                .employmentStatus(EmployeeStatus.ACTIVE)
                .qualificationStatus(EmployeeQualificationStatus.TRAINING_DUE)
                .isActive(true)
                .createdBy("test")
                .createdAt(now)
                .build());

        trainingAssignmentRepository.save(TrainingAssignment.builder()
                .id(UUID.randomUUID())
                .assignmentCode("TRN-KPI-" + suffix)
                .employeeId(employeeId)
                .assignedUsername("admin")
                .trainingTitle("Dashboard KPI training")
                .trainingType(TrainingType.GMP)
                .status(TrainingAssignmentStatus.ASSIGNED)
                .dueDate(today.minusDays(2))
                .assignedBy("test")
                .assignedAt(now)
                .isActive(true)
                .build());

        MvcResult result = mockMvc.perform(get("/api/qms/analytics")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(body.get("openChangeControls").asLong() >= 1);
        assertTrue(body.get("pendingCCApprovals").asLong() >= 1);
        assertTrue(body.get("overdueEffectivenessChecks").asLong() >= 1);
        assertTrue(body.get("documentsAwaitingReview").asLong() >= 1);
        assertTrue(body.get("overdueTrainingAssignments").asLong() >= 1);
    }

    private String loginAsAdmin() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "Admin@123"
                                }
                                """))
                .andReturn();
        assertEquals(200, loginResult.getResponse().getStatus(), loginResult.getResponse().getContentAsString());
        return objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
