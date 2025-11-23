-- testuser@pdflab.com password: TestPass123!
UPDATE users SET password_hash = '$2b$10$IgF4ViwiZP45ZYFRL.ooSOnOMXNtPOTJzHQCbBBCwcDq7QC.2RfiW' WHERE email = 'testuser@pdflab.com';
-- admin@pdflab.test password: Admin123!
UPDATE users SET password_hash = '$2b$10$NAR83cXXLRzICxmcGhaL2uUck2Gr8LqSdxkBSojtkfcSv0xNJunB2' WHERE email = 'admin@pdflab.test';
-- mmkela@gmail.com password: TestPass123!
UPDATE users SET password_hash = '$2b$10$dX.EmFo61JHRSwI1rkJoWe5nBozkS26z/70TAisnpm36wkijF7JgK' WHERE email = 'mmkela@gmail.com';
SELECT email, 'Password updated' as status FROM users WHERE email IN ('testuser@pdflab.com', 'admin@pdflab.test', 'mmkela@gmail.com');
