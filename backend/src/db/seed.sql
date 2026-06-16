-- =============================================================================
-- AI Job Application Portal — Development Seed Data
-- =============================================================================
-- Prerequisites: Run 001_init.sql (or schema.sql + indexes.sql) first.
-- Passwords: All seeded users use "Password123!" hashed with bcrypt (12 rounds).
-- =============================================================================

-- Clear existing seed data (in reverse dependency order)
TRUNCATE refresh_tokens, notifications, ai_analysis, applications, resumes, jobs, profiles, users CASCADE;

-- =============================================================================
-- ADMIN USERS (2)
-- =============================================================================

-- Admin 1: Sarah Chen (TechCorp recruiter)
INSERT INTO users (id, email, password_hash, name, role) VALUES
('a0000001-0000-0000-0000-000000000001', 'sarah.chen@techcorp.com',
 '$2b$12$LJ3m4ys3Lg4VJbmHhEJDOu5Y9K6aD3AelWJ6Y7m0S1XzD.qLGfJXe',
 'Sarah Chen', 'ADMIN');

INSERT INTO profiles (user_id, headline, bio, location, phone, linkedin_url, skills, profile_completion) VALUES
('a0000001-0000-0000-0000-000000000001', 'Senior Technical Recruiter at TechCorp',
 'Experienced recruiter specializing in engineering talent acquisition with 8+ years in the tech industry.',
 'San Francisco, CA', '+1-415-555-0101', 'https://linkedin.com/in/sarahchen',
 '["Talent Acquisition", "Technical Recruiting", "Team Building"]'::jsonb, 85);

-- Admin 2: Marcus Johnson (StartupHub founder)
INSERT INTO users (id, email, password_hash, name, role) VALUES
('a0000002-0000-0000-0000-000000000002', 'marcus@startuphub.io',
 '$2b$12$LJ3m4ys3Lg4VJbmHhEJDOu5Y9K6aD3AelWJ6Y7m0S1XzD.qLGfJXe',
 'Marcus Johnson', 'ADMIN');

INSERT INTO profiles (user_id, headline, bio, location, phone, linkedin_url, skills, profile_completion) VALUES
('a0000002-0000-0000-0000-000000000002', 'Founder & CEO at StartupHub',
 'Building the next generation of developer tools. Always hiring passionate engineers.',
 'Austin, TX', '+1-512-555-0202', 'https://linkedin.com/in/marcusjohnson',
 '["Entrepreneurship", "Product Strategy", "Engineering Leadership"]'::jsonb, 80);

-- =============================================================================
-- REGULAR USERS (5)
-- =============================================================================

-- User 1: Priya Sharma (Full-stack developer)
INSERT INTO users (id, email, password_hash, name, role) VALUES
('u0000001-0000-0000-0000-000000000001', 'priya.sharma@email.com',
 '$2b$12$LJ3m4ys3Lg4VJbmHhEJDOu5Y9K6aD3AelWJ6Y7m0S1XzD.qLGfJXe',
 'Priya Sharma', 'USER');

INSERT INTO profiles (user_id, headline, bio, location, phone, website, linkedin_url, github_url, skills, experience, education, profile_completion) VALUES
('u0000001-0000-0000-0000-000000000001', 'Full Stack Developer | React & Node.js',
 'Passionate full-stack developer with 3 years of experience building scalable web applications. Strong focus on React ecosystem and Node.js backends.',
 'Bengaluru, India', '+91-98765-43210', 'https://priyasharma.dev',
 'https://linkedin.com/in/priyasharma', 'https://github.com/priyasharma',
 '["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "GraphQL", "Redis"]'::jsonb,
 '[{"company":"WebFlow Inc","title":"Full Stack Developer","startDate":"2023-01","endDate":"","current":true,"description":"Building enterprise SaaS dashboard with React and Node.js microservices."},{"company":"CodeBase Solutions","title":"Junior Developer","startDate":"2021-06","endDate":"2022-12","current":false,"description":"Developed REST APIs and React components for e-commerce platform."}]'::jsonb,
 '[{"institution":"Indian Institute of Technology, Bengaluru","degree":"B.Tech","field":"Computer Science","startYear":2017,"endYear":2021}]'::jsonb,
 95);

-- User 2: James Wilson (Backend engineer)
INSERT INTO users (id, email, password_hash, name, role) VALUES
('u0000002-0000-0000-0000-000000000002', 'james.wilson@email.com',
 '$2b$12$LJ3m4ys3Lg4VJbmHhEJDOu5Y9K6aD3AelWJ6Y7m0S1XzD.qLGfJXe',
 'James Wilson', 'USER');

INSERT INTO profiles (user_id, headline, bio, location, phone, linkedin_url, github_url, skills, experience, education, profile_completion) VALUES
('u0000002-0000-0000-0000-000000000002', 'Backend Engineer | Python & Go',
 'Backend engineer focused on distributed systems and API design. Open source contributor.',
 'Seattle, WA', '+1-206-555-0303',
 'https://linkedin.com/in/jameswilson', 'https://github.com/jameswilson',
 '["Python", "Go", "Kubernetes", "PostgreSQL", "gRPC", "Terraform"]'::jsonb,
 '[{"company":"CloudScale","title":"Backend Engineer","startDate":"2022-03","endDate":"","current":true,"description":"Designing and maintaining microservices handling 10M+ daily requests."}]'::jsonb,
 '[{"institution":"University of Washington","degree":"M.S.","field":"Computer Science","startYear":2019,"endYear":2021},{"institution":"Oregon State University","degree":"B.S.","field":"Software Engineering","startYear":2015,"endYear":2019}]'::jsonb,
 90);

-- User 3: Emily Zhang (Frontend developer, recent grad)
INSERT INTO users (id, email, password_hash, name, role) VALUES
('u0000003-0000-0000-0000-000000000003', 'emily.zhang@email.com',
 '$2b$12$LJ3m4ys3Lg4VJbmHhEJDOu5Y9K6aD3AelWJ6Y7m0S1XzD.qLGfJXe',
 'Emily Zhang', 'USER');

INSERT INTO profiles (user_id, headline, bio, location, phone, linkedin_url, skills, education, profile_completion) VALUES
('u0000003-0000-0000-0000-000000000003', 'Frontend Developer | React & Next.js',
 'Recent CS graduate passionate about building beautiful, accessible user interfaces.',
 'New York, NY', '+1-212-555-0404', 'https://linkedin.com/in/emilyzhang',
 '["React", "Next.js", "TypeScript", "Tailwind CSS", "Figma", "Jest"]'::jsonb,
 '[{"institution":"Columbia University","degree":"B.S.","field":"Computer Science","startYear":2020,"endYear":2024}]'::jsonb,
 70);

-- User 4: Carlos Rivera (DevOps engineer)
INSERT INTO users (id, email, password_hash, name, role) VALUES
('u0000004-0000-0000-0000-000000000004', 'carlos.rivera@email.com',
 '$2b$12$LJ3m4ys3Lg4VJbmHhEJDOu5Y9K6aD3AelWJ6Y7m0S1XzD.qLGfJXe',
 'Carlos Rivera', 'USER');

INSERT INTO profiles (user_id, headline, bio, location, phone, linkedin_url, skills, experience, education, profile_completion) VALUES
('u0000004-0000-0000-0000-000000000004', 'DevOps Engineer | AWS & Kubernetes',
 'Infrastructure and reliability engineer with a passion for automation and observability.',
 'Denver, CO', '+1-303-555-0505', 'https://linkedin.com/in/carlosrivera',
 '["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD", "Python", "Prometheus", "Grafana"]'::jsonb,
 '[{"company":"InfraScale","title":"Senior DevOps Engineer","startDate":"2021-01","endDate":"","current":true,"description":"Managing multi-region Kubernetes clusters serving 500+ microservices."},{"company":"DataPipe","title":"DevOps Engineer","startDate":"2019-06","endDate":"2020-12","current":false,"description":"Built CI/CD pipelines and containerized legacy applications."}]'::jsonb,
 '[{"institution":"University of Colorado Boulder","degree":"B.S.","field":"Computer Engineering","startYear":2015,"endYear":2019}]'::jsonb,
 88);

-- User 5: Aisha Patel (Data scientist)
INSERT INTO users (id, email, password_hash, name, role) VALUES
('u0000005-0000-0000-0000-000000000005', 'aisha.patel@email.com',
 '$2b$12$LJ3m4ys3Lg4VJbmHhEJDOu5Y9K6aD3AelWJ6Y7m0S1XzD.qLGfJXe',
 'Aisha Patel', 'USER');

INSERT INTO profiles (user_id, headline, bio, location, phone, linkedin_url, skills, experience, education, profile_completion) VALUES
('u0000005-0000-0000-0000-000000000005', 'Data Scientist | ML & NLP',
 'Data scientist specializing in NLP and recommendation systems. Published researcher.',
 'Boston, MA', '+1-617-555-0606', 'https://linkedin.com/in/aishapatel',
 '["Python", "TensorFlow", "PyTorch", "SQL", "NLP", "Scikit-learn", "Pandas", "Spark"]'::jsonb,
 '[{"company":"MLWorks","title":"Data Scientist","startDate":"2022-09","endDate":"","current":true,"description":"Building NLP models for document classification and entity extraction."}]'::jsonb,
 '[{"institution":"MIT","degree":"M.S.","field":"Data Science","startYear":2020,"endYear":2022},{"institution":"University of Mumbai","degree":"B.Tech","field":"Computer Science","startYear":2016,"endYear":2020}]'::jsonb,
 92);

-- =============================================================================
-- JOBS (6 postings by admins)
-- =============================================================================

-- Job 1: Published - Senior React Developer (by Sarah)
INSERT INTO jobs (id, posted_by, title, company, description, requirements, location, salary_min, salary_max, job_type, status) VALUES
('j0000001-0000-0000-0000-000000000001',
 'a0000001-0000-0000-0000-000000000001',
 'Senior React Developer',
 'TechCorp',
 'We are looking for a Senior React Developer to join our frontend team. You will be responsible for building and maintaining our customer-facing SaaS dashboard used by 50,000+ daily active users. You will work closely with our design and backend teams to deliver pixel-perfect, performant user interfaces.',
 '5+ years of professional experience with React and TypeScript. Strong understanding of state management (Redux, Zustand, or Context API). Experience with Next.js and server-side rendering. Familiarity with testing frameworks (Jest, React Testing Library). Experience with CI/CD pipelines and Git workflows.',
 'San Francisco, CA (Hybrid)',
 120000, 180000, 'FULL_TIME', 'PUBLISHED');

-- Job 2: Published - Backend Engineer (by Sarah)
INSERT INTO jobs (id, posted_by, title, company, description, requirements, location, salary_min, salary_max, job_type, status) VALUES
('j0000002-0000-0000-0000-000000000002',
 'a0000001-0000-0000-0000-000000000001',
 'Backend Engineer - Node.js',
 'TechCorp',
 'Join our backend team to design and build scalable REST APIs powering our enterprise platform. You will own critical microservices handling authentication, data processing, and third-party integrations. This role offers significant technical ownership and growth opportunities.',
 '3+ years building production REST APIs with Node.js and TypeScript. Strong PostgreSQL experience including query optimization. Understanding of authentication patterns (JWT, OAuth). Docker and Kubernetes experience preferred. Excellent problem-solving skills.',
 'San Francisco, CA (Remote OK)',
 100000, 160000, 'REMOTE', 'PUBLISHED');

-- Job 3: Published - Full Stack Engineer (by Marcus)
INSERT INTO jobs (id, posted_by, title, company, description, requirements, location, salary_min, salary_max, job_type, status) VALUES
('j0000003-0000-0000-0000-000000000003',
 'a0000002-0000-0000-0000-000000000002',
 'Full Stack Engineer',
 'StartupHub',
 'We are a fast-growing startup building developer tools. As our first full-stack hire, you will have a massive impact on product direction and architecture decisions. You will work across the entire stack: React frontend, Node.js API, and PostgreSQL database.',
 '2+ years full-stack experience with React and Node.js. TypeScript proficiency required. PostgreSQL or similar relational database experience. Startup mindset — comfortable with ambiguity and rapid iteration. Strong communication skills.',
 'Austin, TX',
 90000, 140000, 'FULL_TIME', 'PUBLISHED');

-- Job 4: Published - DevOps Engineer (by Marcus)
INSERT INTO jobs (id, posted_by, title, company, description, requirements, location, salary_min, salary_max, job_type, status) VALUES
('j0000004-0000-0000-0000-000000000004',
 'a0000002-0000-0000-0000-000000000002',
 'DevOps Engineer',
 'StartupHub',
 'Own our entire infrastructure as we scale from thousands to millions of users. You will design CI/CD pipelines, manage cloud infrastructure, implement monitoring, and ensure 99.9% uptime across all services.',
 'Strong AWS or GCP experience. Kubernetes and Docker expertise. Terraform or Pulumi for IaC. CI/CD pipeline experience (GitHub Actions, GitLab CI). Monitoring stack experience (Prometheus, Grafana, Datadog). Python or Go scripting.',
 'Austin, TX (Hybrid)',
 110000, 165000, 'FULL_TIME', 'PUBLISHED');

-- Job 5: Draft - Data Scientist (by Sarah, not yet published)
INSERT INTO jobs (id, posted_by, title, company, description, requirements, location, salary_min, salary_max, job_type, status) VALUES
('j0000005-0000-0000-0000-000000000005',
 'a0000001-0000-0000-0000-000000000001',
 'Data Scientist - NLP',
 'TechCorp',
 'Join our AI team to build NLP models for resume parsing and job matching. You will work on cutting-edge language models to improve our AI-powered recruitment features.',
 'M.S. or Ph.D. in Computer Science, Statistics, or related field. Strong Python and ML framework experience (TensorFlow, PyTorch). NLP experience required. SQL proficiency. Research publication record preferred.',
 'San Francisco, CA',
 130000, 200000, 'FULL_TIME', 'DRAFT');

-- Job 6: Closed - Frontend Intern (by Marcus, hiring completed)
INSERT INTO jobs (id, posted_by, title, company, description, requirements, location, salary_min, salary_max, job_type, status, closed_at) VALUES
('j0000006-0000-0000-0000-000000000006',
 'a0000002-0000-0000-0000-000000000002',
 'Frontend Intern - Summer 2026',
 'StartupHub',
 'Summer internship opportunity for aspiring frontend developers. You will work on real product features using React and TypeScript under mentorship from senior engineers.',
 'Currently enrolled in CS or related degree. Familiarity with React and JavaScript. Portfolio or GitHub projects demonstrating frontend skills. Eagerness to learn.',
 'Austin, TX',
 25000, 35000, 'INTERNSHIP', 'CLOSED', '2026-05-01T00:00:00Z');

-- =============================================================================
-- RESUMES (for users who will apply)
-- =============================================================================

INSERT INTO resumes (id, user_id, name, file_url, file_key, is_default) VALUES
('r0000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000001',
 'Priya_Sharma_Resume_2026.pdf', 'https://storage.example.com/resumes/priya_2026.pdf',
 'resumes/u0000001/priya_2026.pdf', TRUE),
('r0000002-0000-0000-0000-000000000002', 'u0000002-0000-0000-0000-000000000002',
 'James_Wilson_Resume.pdf', 'https://storage.example.com/resumes/james_2026.pdf',
 'resumes/u0000002/james_2026.pdf', TRUE),
('r0000003-0000-0000-0000-000000000003', 'u0000003-0000-0000-0000-000000000003',
 'Emily_Zhang_Resume.pdf', 'https://storage.example.com/resumes/emily_2026.pdf',
 'resumes/u0000003/emily_2026.pdf', TRUE),
('r0000004-0000-0000-0000-000000000004', 'u0000004-0000-0000-0000-000000000004',
 'Carlos_Rivera_Resume.pdf', 'https://storage.example.com/resumes/carlos_2026.pdf',
 'resumes/u0000004/carlos_2026.pdf', TRUE),
('r0000005-0000-0000-0000-000000000005', 'u0000005-0000-0000-0000-000000000005',
 'Aisha_Patel_CV.pdf', 'https://storage.example.com/resumes/aisha_2026.pdf',
 'resumes/u0000005/aisha_2026.pdf', TRUE);

-- =============================================================================
-- APPLICATIONS (sample applications to published jobs)
-- =============================================================================

-- Priya applies to Senior React Developer (match: strong)
INSERT INTO applications (id, job_id, user_id, resume_id, cover_letter, status, ai_match_score) VALUES
('ap000001-0000-0000-0000-000000000001',
 'j0000001-0000-0000-0000-000000000001',
 'u0000001-0000-0000-0000-000000000001',
 'r0000001-0000-0000-0000-000000000001',
 'I am excited to apply for the Senior React Developer position at TechCorp. With 3 years of experience building React applications and a strong TypeScript background, I believe I would be a great fit for your frontend team.',
 'SHORTLISTED', 85);

-- Priya also applies to Full Stack Engineer
INSERT INTO applications (id, job_id, user_id, resume_id, cover_letter, status, ai_match_score) VALUES
('ap000002-0000-0000-0000-000000000002',
 'j0000003-0000-0000-0000-000000000003',
 'u0000001-0000-0000-0000-000000000001',
 'r0000001-0000-0000-0000-000000000001',
 'As a full-stack developer experienced in both React and Node.js, I am thrilled about the opportunity to join StartupHub as your first full-stack hire.',
 'REVIEWING', 78);

-- James applies to Backend Engineer
INSERT INTO applications (id, job_id, user_id, resume_id, cover_letter, status, ai_match_score) VALUES
('ap000003-0000-0000-0000-000000000003',
 'j0000002-0000-0000-0000-000000000002',
 'u0000002-0000-0000-0000-000000000002',
 'r0000002-0000-0000-0000-000000000002',
 'With extensive backend engineering experience and a focus on distributed systems, I am eager to contribute to TechCorp''s API infrastructure.',
 'PENDING', 72);

-- Emily applies to Senior React Developer
INSERT INTO applications (id, job_id, user_id, resume_id, cover_letter, status, ai_match_score) VALUES
('ap000004-0000-0000-0000-000000000004',
 'j0000001-0000-0000-0000-000000000001',
 'u0000003-0000-0000-0000-000000000003',
 'r0000003-0000-0000-0000-000000000003',
 'While I am a recent graduate, my strong foundation in React, Next.js, and TypeScript makes me a motivated candidate for this role.',
 'REJECTED', 55);

-- Carlos applies to DevOps Engineer
INSERT INTO applications (id, job_id, user_id, resume_id, cover_letter, status, ai_match_score) VALUES
('ap000005-0000-0000-0000-000000000005',
 'j0000004-0000-0000-0000-000000000004',
 'u0000004-0000-0000-0000-000000000004',
 'r0000004-0000-0000-0000-000000000004',
 'I bring 5+ years of DevOps experience with AWS, Kubernetes, and Terraform. I am excited about the challenge of scaling StartupHub''s infrastructure.',
 'SHORTLISTED', 91);

-- Aisha applies to Backend Engineer
INSERT INTO applications (id, job_id, user_id, resume_id, cover_letter, status, ai_match_score) VALUES
('ap000006-0000-0000-0000-000000000006',
 'j0000002-0000-0000-0000-000000000002',
 'u0000005-0000-0000-0000-000000000005',
 'r0000005-0000-0000-0000-000000000005',
 'My experience with Python, SQL, and building ML pipelines gives me a unique perspective on backend engineering challenges.',
 'PENDING', 65);

-- =============================================================================
-- NOTIFICATIONS (sample notifications)
-- =============================================================================

INSERT INTO notifications (user_id, title, message, is_read, link) VALUES
('u0000001-0000-0000-0000-000000000001',
 'Application Shortlisted!',
 'Your application for Senior React Developer at TechCorp has been shortlisted. The hiring team will be in touch soon.',
 TRUE, '/applications'),
('u0000001-0000-0000-0000-000000000001',
 'Application Under Review',
 'Your application for Full Stack Engineer at StartupHub is now being reviewed by the hiring manager.',
 FALSE, '/applications'),
('u0000003-0000-0000-0000-000000000003',
 'Application Update',
 'Your application for Senior React Developer at TechCorp has been reviewed. Unfortunately, we have decided to move forward with other candidates.',
 FALSE, '/applications'),
('u0000004-0000-0000-0000-000000000004',
 'Application Shortlisted!',
 'Great news! Your application for DevOps Engineer at StartupHub has been shortlisted.',
 FALSE, '/applications'),
('a0000001-0000-0000-0000-000000000001',
 'New Application Received',
 'Priya Sharma has applied to your Senior React Developer position at TechCorp.',
 TRUE, '/admin/jobs/j0000001-0000-0000-0000-000000000001/applications'),
('a0000002-0000-0000-0000-000000000002',
 'New Application Received',
 'Carlos Rivera has applied to your DevOps Engineer position at StartupHub.',
 FALSE, '/admin/jobs/j0000004-0000-0000-0000-000000000004/applications');
