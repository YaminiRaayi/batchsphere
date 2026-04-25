package com.batchsphere.core.storage;

import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class LocalStorageService {

    private final Path storageRoot;

    public LocalStorageService(@Value("${app.storage.root:storage}") String storageRoot) {
        this.storageRoot = Paths.get(storageRoot).toAbsolutePath().normalize();
    }

    public String store(String module, String subfolder, MultipartFile file) {
        try {
            String originalFileName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
            String sanitizedFileName = originalFileName.replaceAll("[^A-Za-z0-9._-]", "_");
            String storedFileName = UUID.randomUUID() + "_" + sanitizedFileName;
            Path relativeDirectory = Paths.get(module).resolve(subfolder).normalize();
            Path targetDirectory = storageRoot.resolve(relativeDirectory).normalize();
            if (!targetDirectory.startsWith(storageRoot)) {
                throw new BusinessConflictException("Invalid storage path");
            }
            Files.createDirectories(targetDirectory);
            Path targetFile = targetDirectory.resolve(storedFileName).normalize();
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }
            return relativeDirectory.resolve(storedFileName).toString();
        } catch (IOException exception) {
            throw new BusinessConflictException("Unable to store uploaded document");
        }
    }

    public Resource loadAsResource(String storedPath) {
        try {
            Path targetFile = storageRoot.resolve(storedPath).normalize();
            if (!targetFile.startsWith(storageRoot)) {
                throw new BusinessConflictException("Invalid storage path");
            }
            if (!Files.exists(targetFile)) {
                throw new ResourceNotFoundException("Stored file not found");
            }
            Resource resource = new UrlResource(targetFile.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("Stored file not found");
            }
            return resource;
        } catch (MalformedURLException exception) {
            throw new BusinessConflictException("Unable to load stored document");
        }
    }
}
