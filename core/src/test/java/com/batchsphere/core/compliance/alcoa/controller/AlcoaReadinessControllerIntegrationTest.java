package com.batchsphere.core.compliance.alcoa.controller;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.repository.UserRepository;
import com.batchsphere.core.hrms.employee.entity.Employee;
import com.batchsphere.core.hrms.employee.entity.EmployeeQualificationStatus;
import com.batchsphere.core.hrms.employee.entity.EmployeeStatus;
import com.batchsphere.core.hrms.employee.repository.EmployeeRepository;
import com.batchsphere.core.hrms.training.entity.TrainingAssignment;
import com.batchsphere.core.hrms.training.entity.TrainingAssignmentStatus;
import com.batchsphere.core.hrms.training.entity.TrainingType;
import com.batchsphere.core.hrms.training.repository.TrainingAssignmentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
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
class AlcoaReadinessControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TrainingAssignmentRepository trainingAssignmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        ensureUser("qc_manager_alcoa", UserRole.QC_MANAGER);
        ensureUser("qc_analyst_alcoa", UserRole.QC_ANALYST);
    }

    @Test
    void readinessSummaryAndGapsExposeSeededEvidence() throws Exception {
        String token = login("qc_manager_alcoa");
        UUID assignmentId = UUID.randomUUID();
        UUID auditId = UUID.randomUUID();
        UUID recordId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        employeeRepository.save(Employee.builder()
                .id(employeeId)
                .employeeCode("ALC-EMP-" + employeeId.toString().substring(0, 8))
                .fullName("ALCOA Test Analyst")
                .email("alcoa.test." + employeeId.toString().substring(0, 8) + "@batchsphere.local")
                .department("QC")
                .jobTitle("QC Analyst")
                .employmentStatus(EmployeeStatus.ACTIVE)
                .qualificationStatus(EmployeeQualificationStatus.TRAINING_DUE)
                .isActive(true)
                .createdBy("qc_manager_alcoa")
                .createdAt(LocalDateTime.now())
                .build());

        trainingAssignmentRepository.save(TrainingAssignment.builder()
                .id(assignmentId)
                .assignmentCode("ALC-TRN-" + assignmentId.toString().substring(0, 8))
                .employeeId(employeeId)
                .assignedUsername("qc_analyst_alcoa")
                .trainingTitle("ALCOA++ annual refresher")
                .trainingType(TrainingType.DATA_INTEGRITY)
                .status(TrainingAssignmentStatus.ASSIGNED)
                .dueDate(LocalDate.now().minusDays(1))
                .assignedBy("qc_manager_alcoa")
                .assignedAt(LocalDateTime.now().minusDays(10))
                .isActive(true)
                .build());

        jdbcTemplate.update("""
                insert into audit_event
                (id, entity_type, entity_id, event_type, field_name, old_value, new_value, reason, actor, event_at, source, is_active)
                values (?, 'SAMPLING_REQUEST', ?, 'STATUS_CHANGE', 'status', null, 'APPROVED', null, 'qc_manager_alcoa', ?, 'APPLICATION', true)
                """, auditId, recordId, LocalDateTime.now());

        MvcResult summaryResult = mockMvc.perform(get("/api/compliance/alcoa-readiness/summary")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, summaryResult.getResponse().getStatus(), summaryResult.getResponse().getContentAsString());
        JsonNode summary = objectMapper.readTree(summaryResult.getResponse().getContentAsString());
        assertTrue(summary.get("trainingOverdue").asLong() >= 1);
        assertTrue(summary.get("unsignedCriticalActions").asLong() >= 1);
        assertTrue(summary.get("auditEventsMissingReasonOrValues").asLong() >= 1);
        assertTrue(summary.has("readinessScore"));

        MvcResult gapsResult = mockMvc.perform(get("/api/compliance/alcoa-readiness/gaps")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, gapsResult.getResponse().getStatus(), gapsResult.getResponse().getContentAsString());
        JsonNode gaps = objectMapper.readTree(gapsResult.getResponse().getContentAsString());
        assertTrue(gaps.findValues("entityType").stream().anyMatch(node -> "TRAINING_ASSIGNMENT".equals(node.asText())));
        assertTrue(gaps.findValues("route").stream().anyMatch(node -> node.asText().startsWith("/hrms/training")));
        assertTrue(gaps.findValues("entityType").stream().anyMatch(node -> "SAMPLING_REQUEST".equals(node.asText())));

        MvcResult exportResult = mockMvc.perform(get("/api/compliance/alcoa-readiness/export")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, exportResult.getResponse().getStatus(), exportResult.getResponse().getContentAsString());
        assertTrue(exportResult.getResponse().getContentAsString().contains("entityType"));
        assertTrue(exportResult.getResponse().getContentAsString().contains("TRAINING_ASSIGNMENT"));
    }

    @Test
    void wrongRoleCannotExportReadinessReport() throws Exception {
        String token = login("qc_analyst_alcoa");

        MvcResult result = mockMvc.perform(get("/api/compliance/alcoa-readiness/export")
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        assertEquals(403, result.getResponse().getStatus());
    }

    private String login(String username) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "Test@123"
                                }
                                """.formatted(username)))
                .andReturn();
        assertEquals(200, loginResult.getResponse().getStatus(), loginResult.getResponse().getContentAsString());
        return objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private void ensureUser(String username, UserRole role) {
        if (userRepository.existsByUsername(username)) {
            return;
        }
        userRepository.save(User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email(username + "@batchsphere.local")
                .passwordHash(passwordEncoder.encode("Test@123"))
                .role(role)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
    }
}
