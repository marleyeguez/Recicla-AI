CREATE DATABASE recicla_ai
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE recicla_ai;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    foto VARCHAR(255),
    pontos INT NOT NULL DEFAULT 100,
    notificacoes BOOLEAN NOT NULL DEFAULT TRUE,
    localizacao BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qrcodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    material VARCHAR(50) NOT NULL,
    pontos INT NOT NULL,
    utilizado BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reciclagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    qrcode_id INT NOT NULL,
    pontos_ganhos INT NOT NULL,
    data_reciclagem DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id),

    FOREIGN KEY (qrcode_id)
        REFERENCES qrcodes(id),

    UNIQUE (qrcode_id)
);

CREATE TABLE historico_pontos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    pontos INT NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
);

CREATE TABLE ecopontos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    materiais VARCHAR(255)
);

CREATE TABLE recompensas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    pontos_necessarios INT NOT NULL,
    estoque INT NOT NULL DEFAULT 0,
    imagem VARCHAR(255)
);