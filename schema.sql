-- =============================================
-- Online Voting System - Database Schema
-- =============================================
-- Run this script to create all tables with constraints.

DROP DATABASE IF EXISTS VOTING_SYSTEM;
CREATE DATABASE VOTING_SYSTEM;
USE VOTING_SYSTEM;

-- ---------------------------------------------
-- 1. STUDENT
-- ---------------------------------------------
CREATE TABLE STUDENT (
    user_id     INT PRIMARY KEY AUTO_INCREMENT,
    username    VARCHAR(100) NOT NULL,
    roll_no     VARCHAR(50)  UNIQUE NOT NULL,
    branch      VARCHAR(100) NOT NULL,
    dob         DATE         NOT NULL,
    mobile_no   VARCHAR(15),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    is_eligible BOOLEAN      DEFAULT TRUE
);

-- ---------------------------------------------
-- 2. ADDRESS (One Student → Many Addresses)
-- ---------------------------------------------
CREATE TABLE ADDRESS (
    address_id  INT PRIMARY KEY AUTO_INCREMENT,
    user_id     INT NOT NULL,
        street      VARCHAR(255),
        city        VARCHAR(100),
        state       VARCHAR(100),
        pincode     VARCHAR(10),
    FOREIGN KEY (user_id) REFERENCES STUDENT(user_id) ON DELETE CASCADE
);

-- ---------------------------------------------
-- 3. CANDIDATE
-- ---------------------------------------------
CREATE TABLE CANDIDATE (
    candidate_id INT PRIMARY KEY AUTO_INCREMENT,
    name         VARCHAR(100) NOT NULL,
    branch       VARCHAR(100),
    party_name   VARCHAR(100)
);

-- ---------------------------------------------
-- 4. VOTE
-- One student can vote only once (user_id UNIQUE)
-- ---------------------------------------------
CREATE TABLE VOTE (
    vote_id      INT PRIMARY KEY AUTO_INCREMENT,
    user_id      INT UNIQUE NOT NULL,
    candidate_id INT NOT NULL,
    voted_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)      REFERENCES STUDENT(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES CANDIDATE(candidate_id) ON DELETE CASCADE
);

-- ---------------------------------------------
-- Optional: Index for faster lookups
-- ---------------------------------------------
CREATE INDEX idx_student_roll_no ON STUDENT(roll_no);
CREATE INDEX idx_student_email   ON STUDENT(email);
CREATE INDEX idx_address_user    ON ADDRESS(user_id);
CREATE INDEX idx_vote_candidate  ON VOTE(candidate_id);
