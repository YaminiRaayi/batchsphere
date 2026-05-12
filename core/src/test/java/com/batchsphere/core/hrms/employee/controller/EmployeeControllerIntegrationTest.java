package com.batchsphere.core.hrms.employee.controller;

import com.batchsphere.core.hrms.employee.repository.EmployeeRepository;
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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class EmployeeControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private EmployeeRepository employeeRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void adminCreatesUpdatesAndDeactivatesEmployee() throws Exception {
        String token = loginAsAdmin();
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        JsonNode manager = createEmployee(token, "EMP-MGR-" + suffix, "QA Manager " + suffix, null);
        JsonNode analyst = createEmployee(token, "EMP-QC-" + suffix, "QC Analyst " + suffix, manager.get("id").asText());

        assertEquals("EMP-QC-" + suffix, analyst.get("employeeCode").asText());
        assertEquals("Quality Control", analyst.get("department").asText());
        assertEquals(manager.get("id").asText(), analyst.get("managerEmployeeId").asText());
        assertEquals("QA Manager " + suffix, analyst.get("managerName").asText());

        MvcResult updateResult = mockMvc.perform(put("/api/employees/{id}", analyst.get("id").asText())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeCode": "%s",
                                  "fullName": "QC Analyst Updated %s",
                                  "email": "qc-updated-%s@example.com",
                                  "phone": "+91 98765 43210",
                                  "department": "Quality Assurance",
                                  "site": "Hyderabad Plant",
                                  "jobTitle": "Senior QC Analyst",
                                  "managerEmployeeId": "%s",
                                  "employmentStatus": "ACTIVE",
                                  "qualificationStatus": "QUALIFIED",
                                  "joinedOn": "%s",
                                  "lastTrainingDate": "%s",
                                  "nextTrainingDue": "%s",
                                  "remarks": "Updated HRMS profile",
                                  "updatedBy": "admin"
                                }
                                """.formatted(
                                analyst.get("employeeCode").asText(),
                                suffix,
                                suffix.toLowerCase(),
                                manager.get("id").asText(),
                                LocalDate.now().minusYears(1),
                                LocalDate.now().minusMonths(1),
                                LocalDate.now().plusMonths(11)
                        )))
                .andReturn();
        assertEquals(200, updateResult.getResponse().getStatus(), updateResult.getResponse().getContentAsString());
        JsonNode updated = objectMapper.readTree(updateResult.getResponse().getContentAsString());
        assertEquals("Quality Assurance", updated.get("department").asText());
        assertEquals("QUALIFIED", updated.get("qualificationStatus").asText());

        MvcResult deleteResult = mockMvc.perform(delete("/api/employees/{id}", analyst.get("id").asText())
                        .header("Authorization", "Bearer " + token)
                        .param("updatedBy", "admin"))
                .andReturn();
        assertEquals(204, deleteResult.getResponse().getStatus(), deleteResult.getResponse().getContentAsString());
        assertTrue(employeeRepository.findById(UUID.fromString(analyst.get("id").asText())).orElseThrow().getIsActive().equals(false));
    }

    @Test
    void duplicateEmployeeCodeIsRejected() throws Exception {
        String token = loginAsAdmin();
        String code = "EMP-DUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        createEmployee(token, code, "First Employee", null);

        MvcResult duplicateResult = mockMvc.perform(post("/api/employees")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employeePayload(code, "Second Employee", null)))
                .andReturn();

        assertEquals(409, duplicateResult.getResponse().getStatus(), duplicateResult.getResponse().getContentAsString());
        assertTrue(duplicateResult.getResponse().getContentAsString().contains("Employee code already exists"));
    }

    @Test
    void employeeCannotBeTheirOwnManager() throws Exception {
        String token = loginAsAdmin();
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        JsonNode employee = createEmployee(token, "EMP-SELF-" + suffix, "Self Manager " + suffix, null);

        MvcResult updateResult = mockMvc.perform(put("/api/employees/{id}", employee.get("id").asText())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employeePayload(employee.get("employeeCode").asText(), "Self Manager " + suffix, employee.get("id").asText())))
                .andReturn();

        assertEquals(409, updateResult.getResponse().getStatus(), updateResult.getResponse().getContentAsString());
        assertTrue(updateResult.getResponse().getContentAsString().contains("Employee cannot be their own manager"));
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

    private JsonNode createEmployee(String token, String employeeCode, String fullName, String managerId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/employees")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employeePayload(employeeCode, fullName, managerId)))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String employeePayload(String employeeCode, String fullName, String managerId) {
        return """
                {
                  "employeeCode": "%s",
                  "fullName": "%s",
                  "email": "%s@example.com",
                  "phone": "+91 98765 43210",
                  "department": "Quality Control",
                  "site": "Hyderabad Plant",
                  "jobTitle": "QC Analyst",
                  "managerEmployeeId": %s,
                  "employmentStatus": "ACTIVE",
                  "qualificationStatus": "PENDING",
                  "joinedOn": "%s",
                  "remarks": "HRMS integration test employee",
                  "createdBy": "admin"
                }
                """.formatted(
                employeeCode,
                fullName,
                employeeCode.toLowerCase(),
                managerId == null ? "null" : "\"" + managerId + "\"",
                LocalDate.now().minusMonths(3)
        );
    }
}
