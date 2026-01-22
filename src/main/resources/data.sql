INSERT INTO users(id, name, email) VALUES
  (RANDOM_UUID(), 'Hon Jun', 'hon@example.com');

INSERT INTO events(id, title, description, start_time, location, category) VALUES
  (RANDOM_UUID(), 'Welcome Week', 'Kickoff', TIMESTAMP '2030-01-01 18:00:00', 'City Campus', 'Campus'),
  (RANDOM_UUID(), 'Hack Night', 'Code + pizza', TIMESTAMP '2030-01-05 19:00:00', 'Lab 3', 'Tech');
