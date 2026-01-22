-- Create admin user with proper BCrypt hash
-- Password: admin123
-- Hash generated with BCrypt strength 10

INSERT INTO user (id, name, email, password, role, created_at, updated_at) 
VALUES (
    1,
    'Admin User', 
    'admin@test.com', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    'ADMIN',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role = 'ADMIN';

-- Create some sample events for testing
INSERT INTO event (id, title, description, event_date, event_time, location, max_attendees, image_path, created_by_id, created_at, updated_at) VALUES
(1, 'Tech Talk: Future of AI', 'An engaging discussion about the future developments in artificial intelligence and machine learning.', '2024-10-15', '14:00:00', 'Room 101, Building A', 50, '/uploads/sample1.jpg', 1, NOW(), NOW()),
(2, 'Workshop: Web Development', 'Hands-on workshop covering modern web development techniques using React and Spring Boot.', '2024-10-20', '10:00:00', 'Computer Lab 1', 30, '/uploads/sample2.jpg', 1, NOW(), NOW()),
(3, 'Career Fair 2024', 'Meet with industry professionals and explore career opportunities in technology.', '2024-10-25', '09:00:00', 'Main Auditorium', 200, '/uploads/sample3.jpg', 1, NOW(), NOW()),
(4, 'Student Networking Event', 'Connect with fellow students and build professional relationships.', '2024-10-30', '18:00:00', 'Student Lounge', 75, '/uploads/sample4.jpg', 1, NOW(), NOW()),
(5, 'Coding Competition', 'Test your programming skills in our annual coding competition.', '2024-11-05', '13:00:00', 'Room 205, Building B', 40, '/uploads/sample5.jpg', 1, NOW(), NOW()),
(6, 'Guest Lecture: Cybersecurity', 'Learn about the latest trends and threats in cybersecurity.', '2024-11-10', '15:00:00', 'Lecture Hall 3', 100, '/uploads/sample6.jpg', 1, NOW(), NOW()),
(7, 'Innovation Showcase', 'Present your innovative projects and ideas to the community.', '2024-11-15', '16:00:00', 'Exhibition Hall', 150, '/uploads/sample7.jpg', 1, NOW(), NOW()),
(8, 'Alumni Meetup', 'Reconnect with alumni and learn about life after graduation.', '2024-11-20', '19:00:00', 'Conference Room A', 60, '/uploads/sample8.jpg', 1, NOW(), NOW()),
(9, 'Startup Pitch Day', 'Watch entrepreneurs pitch their startup ideas to investors.', '2024-11-25', '11:00:00', 'Room 301, Building C', 80, '/uploads/sample9.jpg', 1, NOW(), NOW()),
(10, 'Year-End Celebration', 'Join us for our annual year-end celebration and awards ceremony.', '2024-12-01', '17:00:00', 'Main Hall', 300, '/uploads/sample10.jpg', 1, NOW(), NOW());