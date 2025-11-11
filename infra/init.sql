-- users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text,
  email_verified boolean DEFAULT false,
  role text DEFAULT 'user',
  created_at timestamptz,
  updated_at timestamptz
);

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  visibility text DEFAULT 'private',
  created_at timestamptz,
  updated_at timestamptz
);

-- tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo',
  priority text DEFAULT 'medium',
  assignee_id uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id),
  due_date date,
  created_at timestamptz,
  updated_at timestamptz
);
