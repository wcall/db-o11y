CREATE DATABASE IF NOT EXISTS super_awesome_application;

USE super_awesome_application;

CREATE TABLE IF NOT EXISTS company (
    companyid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    companyname VARCHAR(50) NOT NULL
);

INSERT INTO company (companyname) VALUES
    ('Grafana Labs'),
    ('Azure'),
    ('Amazon'),
    ('Google');

CREATE TABLE IF NOT EXISTS employee (
    employeeid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    companyid INT NOT NULL,
    employeename VARCHAR(50) NOT NULL,
    salary INT NOT NULL,
    FOREIGN KEY (companyid) REFERENCES company(companyid)
);  

INSERT INTO employee (companyid, employeename, salary) VALUES
    (1, 'Alice', 120000),
    (1, 'Bob', 110000),
    (2, 'Charlie', 130000),
    (2, 'David', 125000),
    (3, 'Eve', 115000),
    (3, 'Frank', 105000),
    (4, 'Grace', 140000),
    (4, 'Heidi', 135000);
