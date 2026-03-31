-- =============================================
-- TaskFlow Database Schema
-- Version: 1.0
-- =============================================

CREATE DATABASE IF NOT EXISTS taskflow_db;
USE taskflow_db;

-- ─── USERS TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── TASKS TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  priority    ENUM('high','medium','low') DEFAULT 'medium',
  status      ENUM('pending','inprogress','completed') DEFAULT 'pending',
  category    VARCHAR(50) DEFAULT 'Other',
  due_date    DATE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── CATEGORIES TABLE ────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id      INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name    VARCHAR(100) NOT NULL,
  color   VARCHAR(20) DEFAULT '#6ee7b7',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── INDEXES ─────────────────────────────────
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- ─── SAMPLE DATA ─────────────────────────────
INSERT INTO users (name, email, password) VALUES
('Demo User', 'demo@taskflow.com', '$2b$10$examplehashedpassword');

INSERT INTO tasks (user_id, title, description, priority, status, category, due_date) VALUES
(1, 'Set up GCP project', 'Create and configure Google Cloud project', 'high', 'completed', 'Work', '2026-03-20'),
(1, 'Build login page', 'Design and implement login UI', 'high', 'completed', 'Work', '2026-03-21'),
(1, 'Write SRS document', 'Complete software requirements specification', 'medium', 'pending', 'Study', '2026-03-25'),
(1, 'Deploy to App Engine', 'Host application on GCP', 'high', 'pending', 'Work', '2026-04-15'),
(1, 'Prepare presentation', 'Create slides for slot 2 presentation', 'medium', 'pending', 'Study', '2026-04-20');
