ALTER TABLE material_label
    ADD COLUMN qr_payload VARCHAR(4000);

ALTER TABLE material_label
    ADD COLUMN qr_code_data_url VARCHAR(12000);
