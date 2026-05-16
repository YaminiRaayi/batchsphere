package com.batchsphere.core.report;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.beans.IntrospectionException;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.time.temporal.TemporalAccessor;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CsvExportService {

    public boolean requested(String format, String acceptHeader) {
        return "csv".equalsIgnoreCase(format)
                || (acceptHeader != null && acceptHeader.toLowerCase().contains("text/csv"));
    }

    public ResponseEntity<byte[]> response(String filename, List<?> rows) {
        byte[] bytes = toCsv(rows).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }

    private String toCsv(List<?> rows) {
        if (rows == null || rows.isEmpty()) {
            return "";
        }
        List<PropertyDescriptor> properties = properties(rows.get(0).getClass());
        StringBuilder csv = new StringBuilder();
        appendLine(csv, properties.stream().map(PropertyDescriptor::getName).toList());
        for (Object row : rows) {
            appendLine(csv, properties.stream().map(property -> read(row, property)).toList());
        }
        return csv.toString();
    }

    private List<PropertyDescriptor> properties(Class<?> type) {
        try {
            return List.of(Introspector.getBeanInfo(type, Object.class).getPropertyDescriptors()).stream()
                    .filter(property -> property.getReadMethod() != null)
                    .filter(property -> isSimple(property.getPropertyType()))
                    .sorted(Comparator.comparing(PropertyDescriptor::getName))
                    .toList();
        } catch (IntrospectionException ex) {
            throw new IllegalStateException("Failed to inspect CSV fields for " + type.getSimpleName(), ex);
        }
    }

    private boolean isSimple(Class<?> type) {
        return type.isPrimitive()
                || CharSequence.class.isAssignableFrom(type)
                || Number.class.isAssignableFrom(type)
                || Boolean.class.equals(type)
                || Character.class.equals(type)
                || UUID.class.equals(type)
                || Enum.class.isAssignableFrom(type)
                || TemporalAccessor.class.isAssignableFrom(type)
                || BigDecimal.class.equals(type)
                || BigInteger.class.equals(type)
                || (!Collection.class.isAssignableFrom(type) && !Map.class.isAssignableFrom(type) && type.getPackageName().startsWith("java.time"));
    }

    private String read(Object row, PropertyDescriptor property) {
        try {
            Method readMethod = property.getReadMethod();
            Object value = readMethod.invoke(row);
            return value != null ? value.toString() : "";
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to read CSV field " + property.getName(), ex);
        }
    }

    private void appendLine(StringBuilder csv, List<String> values) {
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) {
                csv.append(',');
            }
            csv.append(escape(values.get(i)));
        }
        csv.append('\n');
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        boolean quote = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
        String escaped = value.replace("\"", "\"\"");
        return quote ? "\"" + escaped + "\"" : escaped;
    }
}
