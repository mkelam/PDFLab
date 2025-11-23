CREATE DATABASE IF NOT EXISTS pdflab_production DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE pdflab_production;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_audit_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `admin_user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `changes` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
  `checksum` varchar(64) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_audit_logs_admin_user_id` (`admin_user_id`),
  KEY `admin_audit_logs_entity_type_entity_id` (`entity_type`,`entity_id`),
  KEY `admin_audit_logs_created_at` (`created_at`),
  KEY `admin_audit_logs_severity` (`severity`),
  CONSTRAINT `admin_audit_logs_ibfk_1` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversion_jobs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `type` enum('pdf_to_pptx','pdf_to_docx','pdf_to_xlsx','pdf_to_images','pdf_merge') NOT NULL,
  `status` enum('pending','queued','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `progress` int NOT NULL DEFAULT '0',
  `input_file` varchar(500) DEFAULT NULL,
  `output_file` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size` bigint NOT NULL,
  `cloudconvert_job_id` varchar(255) DEFAULT NULL,
  `error_message` text,
  `estimated_time` int DEFAULT NULL COMMENT 'Estimated processing time in seconds',
  `processing_started_at` datetime DEFAULT NULL,
  `processing_completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `conversion_jobs_user_id` (`user_id`),
  KEY `conversion_jobs_status` (`status`),
  KEY `conversion_jobs_created_at` (`created_at`),
  KEY `conversion_jobs_expires_at` (`expires_at`),
  KEY `conversion_jobs_cloudconvert_job_id` (`cloudconvert_job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_history` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `password_history_user_id` (`user_id`),
  KEY `password_history_created_at` (`created_at`),
  CONSTRAINT `password_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `subscription_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `transaction_id` varchar(255) NOT NULL COMMENT 'Our internal transaction ID (m_payment_id)',
  `payfast_payment_id` varchar(255) DEFAULT NULL COMMENT 'PayFast payment ID (pf_payment_id)',
  `payment_type` enum('subscription','subscription_payment','one_time','refund') NOT NULL DEFAULT 'one_time',
  `status` enum('complete','failed','pending','cancelled') NOT NULL DEFAULT 'pending',
  `amount_gross` decimal(10,2) NOT NULL COMMENT 'Gross amount before fees',
  `amount_fee` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'PayFast processing fee',
  `amount_net` decimal(10,2) NOT NULL COMMENT 'Net amount after fees',
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `plan` varchar(50) NOT NULL COMMENT 'Plan name (free, starter, pro, enterprise)',
  `payment_method` varchar(50) DEFAULT NULL COMMENT 'Payment method used (eft, credit_card, etc.)',
  `name_first` varchar(255) NOT NULL,
  `name_last` varchar(255) DEFAULT NULL,
  `email_address` varchar(255) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `item_description` text,
  `custom_data` json DEFAULT NULL COMMENT 'Custom data sent to PayFast',
  `itn_data` json DEFAULT NULL COMMENT 'Full ITN notification data from PayFast',
  `error_message` text COMMENT 'Error message if payment failed',
  `processed_at` datetime DEFAULT NULL COMMENT 'When the payment was processed',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_id` (`transaction_id`),
  KEY `payment_logs_user_id` (`user_id`),
  KEY `payment_logs_subscription_id` (`subscription_id`),
  KEY `payment_logs_payfast_payment_id` (`payfast_payment_id`),
  KEY `payment_logs_status` (`status`),
  KEY `payment_logs_created_at` (`created_at`),
  CONSTRAINT `payment_logs_ibfk_11` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payment_logs_ibfk_12` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `plan` enum('free','starter','pro','enterprise') NOT NULL DEFAULT 'free',
  `status` enum('active','canceled','past_due','trialing','pending') NOT NULL DEFAULT 'pending',
  `payfast_token` varchar(255) DEFAULT NULL COMMENT 'PayFast subscription token for recurring payments',
  `payfast_subscription_id` varchar(255) DEFAULT NULL COMMENT 'PayFast subscription ID',
  `amount` decimal(10,2) NOT NULL COMMENT 'Subscription amount in currency',
  `currency` varchar(3) NOT NULL DEFAULT 'USD' COMMENT 'Currency code (USD for United States Dollar)',
  `billing_date` datetime DEFAULT NULL COMMENT 'First billing date',
  `next_billing_date` datetime DEFAULT NULL COMMENT 'Next billing date for recurring subscription',
  `cancel_at` datetime DEFAULT NULL COMMENT 'Scheduled cancellation date',
  `canceled_at` datetime DEFAULT NULL COMMENT 'Actual cancellation timestamp',
  `trial_end` datetime DEFAULT NULL COMMENT 'Trial period end date',
  `started_at` datetime NOT NULL COMMENT 'Subscription start date',
  `ended_at` datetime DEFAULT NULL COMMENT 'Subscription end date (if canceled)',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `subscriptions_user_id` (`user_id`),
  KEY `subscriptions_status` (`status`),
  KEY `subscriptions_payfast_token` (`payfast_token`),
  KEY `subscriptions_next_billing_date` (`next_billing_date`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_health_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `metric_name` varchar(100) NOT NULL,
  `metric_value` decimal(10,2) DEFAULT NULL,
  `status` enum('healthy','warning','critical') NOT NULL DEFAULT 'healthy',
  `details` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `system_health_logs_metric_name` (`metric_name`),
  KEY `system_health_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usage_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `job_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `operation_type` varchar(50) NOT NULL,
  `success` tinyint(1) NOT NULL DEFAULT '0',
  `processing_time` int DEFAULT NULL COMMENT 'Processing time in milliseconds',
  `file_size` bigint NOT NULL,
  `error_code` varchar(50) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `usage_logs_user_id` (`user_id`),
  KEY `usage_logs_timestamp` (`timestamp`),
  KEY `usage_logs_operation_type` (`operation_type`),
  KEY `usage_logs_job_id` (`job_id`),
  CONSTRAINT `usage_logs_ibfk_167` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `usage_logs_ibfk_168` FOREIGN KEY (`job_id`) REFERENCES `conversion_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `role` enum('user','support','finance','admin','super_admin') NOT NULL DEFAULT 'user',
  `plan` enum('free','starter','pro','enterprise') NOT NULL DEFAULT 'free',
  `conversions_used` int NOT NULL DEFAULT '0',
  `conversions_limit` int NOT NULL DEFAULT '3',
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `subscription_id` varchar(255) DEFAULT NULL,
  `subscription_status` enum('active','canceled','past_due','trialing') DEFAULT NULL,
  `subscription_end_date` datetime DEFAULT NULL,
  `failed_reset_attempts` int NOT NULL DEFAULT '0',
  `reset_locked_until` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `last_login` datetime DEFAULT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `email_verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `users_email` (`email`),
  KEY `users_stripe_customer_id` (`stripe_customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
