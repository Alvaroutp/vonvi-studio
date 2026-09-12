USE vonvi_studio;

INSERT INTO usuarios (id, nombres, apellidos, email, password, telefono, rol) VALUES
(1, 'Administrador', 'Vonvi', 'admin@vonvistudio.pe',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '907100820', 'admin'),
(2, 'María', 'Fernández', 'maria@example.com',
    '$2b$10$74VkFfuCPJ9DZqxS3VHjFeICD3FPnpfUBIn8pSSuHSY0QIovPMTui',
    '987654321', 'cliente');
