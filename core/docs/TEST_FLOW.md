# BatchSphere Test Flow

Base URL: `http://localhost:8080`

Security note: all endpoints are currently open because [`SecurityConfig.java`](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/config/SecurityConfig.java#L1) uses `permitAll()`.

## Startup

1. Start PostgreSQL and ensure the database from [`application.yaml`](/Users/induraghav/gitrepo/batchsphere/core/src/main/resources/application.yaml#L1) exists:
   - database: `batchsphere_db`
   - username: `batchsphere_user`
   - password: `StrongPassword123`
2. Run the app:
   ```bash
   ./mvnw spring-boot:run
   ```
3. Confirm the app is reachable:
   ```bash
   curl http://localhost:8080/api/suppliers
   ```

## End-to-End Flow

Use this order because later modules depend on earlier IDs.

### 1. Create Supplier

`POST /api/suppliers`

```json
{
  "supplierCode": "SUP-001",
  "supplierName": "Acme Chemicals",
  "contactPerson": "Ravi Kumar",
  "email": "supplier@acme.com",
  "phone": "9876543210",
  "createdBy": "admin"
}
```

Save `id` as `supplierId`.

### 2. Create Vendor

`POST /api/vendors`

```json
{
  "vendorCode": "VEN-001",
  "vendorName": "Acme Procurement",
  "contactPerson": "Sonia",
  "email": "vendor@acme.com",
  "phone": "9988776655",
  "createdBy": "admin"
}
```

Save `id` as `vendorId`.

### 3. Create Vendor Business Unit

`POST /api/vendors/{vendorId}/business-units`

```json
{
  "unitName": "Hyderabad Unit",
  "address": "Plot 42, Industrial Zone",
  "city": "Hyderabad",
  "state": "Telangana",
  "country": "India",
  "createdBy": "admin"
}
```

Save `id` as `vendorBusinessUnitId`.

### 4. Create Material

`POST /api/materials`

```json
{
  "materialCode": "MAT-001",
  "materialName": "Citric Acid",
  "materialType": "RAW_MATERIAL",
  "uom": "KG",
  "description": "Food grade material",
  "createdBy": "admin"
}
```

Save `id` as `materialId`.

### 5. Create Batch

`POST /api/batches`

```json
{
  "batchNumber": "BAT-001",
  "materialId": "{{materialId}}",
  "batchType": "RAW_MATERIAL",
  "quantity": 100,
  "unitOfMeasure": "KG",
  "manufactureDate": "2026-03-01",
  "expiryDate": "2027-03-01",
  "retestDate": "2026-09-01",
  "createdBy": "admin"
}
```

Save `id` as `batchId`.

### 6. Create GRN

`POST /api/grns`

```json
{
  "grnNumber": "GRN-001",
  "supplierId": "{{supplierId}}",
  "vendorId": "{{vendorId}}",
  "vendorBusinessUnitId": "{{vendorBusinessUnitId}}",
  "receiptDate": "2026-03-17",
  "invoiceNumber": "INV-001",
  "remarks": "Initial inward receipt",
  "createdBy": "admin",
  "items": [
    {
      "materialId": "{{materialId}}",
      "batchId": "{{batchId}}",
      "receivedQuantity": 100,
      "acceptedQuantity": 95,
      "rejectedQuantity": 5,
      "uom": "KG",
      "warehouseLocation": "RM-WH-01-A",
      "unitPrice": 42.50,
      "qcStatus": "PARTIALLY_APPROVED",
      "description": "5 KG rejected during QC"
    }
  ]
}
```

Save `id` as `grnId`.

### 7. Receive GRN

`POST /api/grns/{grnId}/receive`

```json
{
  "updatedBy": "admin"
}
```

This is the key integration point:
- GRN status becomes `RECEIVED`
- inventory is created or updated for the accepted quantity
- inventory transaction history is written with reference type `GRN`

### 8. Validate Inventory Stock

`GET /api/inventory`

Expected result:
- one inventory row exists
- `quantityOnHand = 95`
- `warehouseLocation = "RM-WH-01-A"`
- the row points to the same `materialId` and `batchId`

### 9. Validate Inventory Transactions

`GET /api/inventory/transactions`

Expected result:
- one transaction exists
- `transactionType = "INBOUND"`
- `referenceType = "GRN"`
- `referenceId = {{grnId}}`
- `quantity = 95`

## Useful Read APIs

- `GET /api/suppliers`
- `GET /api/vendors`
- `GET /api/vendor-business-units`
- `GET /api/materials`
- `GET /api/batches`
- `GET /api/grns`
- `GET /api/inventory`
- `GET /api/inventory/transactions`

## Known API Note

The batch delete endpoint in [`BatchController.java`](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/batch/controller/BatchController.java#L1) is currently mapped as `@DeleteMapping` without `/{id}` but still expects `@PathVariable UUID id`. That endpoint will not work until the controller mapping is corrected.
