# Database Schema Documentation

## Overview

The Lolokely application uses **PostgreSQL** as its database system. The schema is designed with:
- **UUID primary keys** for all tables
- **Timestamps** (`created_at`, `updated_at`) for audit trails
- **Foreign key constraints** with cascade deletes
- **Check constraints** for data validation
- **Indexes** for query optimization

## Database Extensions

The database uses the following PostgreSQL extensions:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

These extensions enable UUID generation for primary keys.

---

## Tables

### Users Table

Stores user account information.

**Table Name:** `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| `email` | VARCHAR(120) | NOT NULL, UNIQUE | User email address |
| `password_hash` | VARCHAR(128) | NOT NULL | Bcrypt hashed password |
| `first_name` | VARCHAR(50) | NOT NULL | User's first name |
| `last_name` | VARCHAR(50) | NOT NULL | User's last name |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Relationships:**
- One-to-many with `task_assignments`
- One-to-many with `subtask_assignments`
- One-to-many with `social_posts`
- One-to-one with `user_post_preferences`
- One-to-many with `notifications`

**Indexes:**
- Primary key on `id`
- Unique index on `email`

---

### Tasks Table

Stores task information.

**Table Name:** `tasks`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique task identifier |
| `title` | VARCHAR(200) | NOT NULL | Task title |
| `description` | TEXT | NULL | Task description |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'todo', CHECK | Task status |
| `priority` | VARCHAR(10) | NOT NULL, DEFAULT 'medium', CHECK | Task priority |
| `due_date` | TIMESTAMPTZ | NULL | Task due date |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Task creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Status Values:**
- `todo`: Task is pending
- `in_progress`: Task is actively being worked on
- `completed`: Task is finished

**Priority Values:**
- `low`: Low priority
- `medium`: Medium priority (default)
- `high`: High priority

**Relationships:**
- One-to-many with `subtasks` (CASCADE DELETE)
- Many-to-many with `users` via `task_assignments`
- One-to-many with `task_assignments` (CASCADE DELETE)
- One-to-many with `notifications`

**Indexes:**
- Primary key on `id`
- Index on `created_at` for sorting

---

### Subtasks Table

Stores subtask information linked to parent tasks.

**Table Name:** `subtasks`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique subtask identifier |
| `task_id` | UUID | NOT NULL, FOREIGN KEY | Parent task ID |
| `title` | VARCHAR(200) | NOT NULL | Subtask title |
| `description` | TEXT | NULL | Subtask description |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'todo', CHECK | Subtask status |
| `priority` | VARCHAR(10) | NOT NULL, DEFAULT 'medium', CHECK | Subtask priority |
| `due_date` | TIMESTAMPTZ | NULL | Subtask due date |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Subtask creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Status Values:** Same as tasks (`todo`, `in_progress`, `completed`)

**Priority Values:** Same as tasks (`low`, `medium`, `high`)

**Foreign Key:**
- `task_id` → `tasks.id` ON DELETE CASCADE

**Relationships:**
- Many-to-one with `tasks`
- Many-to-many with `users` via `subtask_assignments`
- One-to-many with `subtask_assignments` (CASCADE DELETE)
- One-to-many with `notifications`

**Indexes:**
- Primary key on `id`
- Index on `task_id` for efficient joins

---

### Task Assignments Table

Junction table for many-to-many relationship between tasks and users.

**Table Name:** `task_assignments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique assignment identifier |
| `task_id` | UUID | NOT NULL, FOREIGN KEY | Task ID |
| `user_id` | UUID | NOT NULL, FOREIGN KEY | User ID |
| `assigned_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Assignment timestamp |

**Foreign Keys:**
- `task_id` → `tasks.id` ON DELETE CASCADE
- `user_id` → `users.id` ON DELETE CASCADE

**Unique Constraint:**
- `(task_id, user_id)` - Prevents duplicate assignments

**Indexes:**
- Primary key on `id`
- Index on `task_id` for efficient queries
- Index on `user_id` for efficient queries

---

### Subtask Assignments Table

Junction table for many-to-many relationship between subtasks and users.

**Table Name:** `subtask_assignments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique assignment identifier |
| `subtask_id` | UUID | NOT NULL, FOREIGN KEY | Subtask ID |
| `user_id` | UUID | NOT NULL, FOREIGN KEY | User ID |
| `assigned_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Assignment timestamp |

**Foreign Keys:**
- `subtask_id` → `subtasks.id` ON DELETE CASCADE
- `user_id` → `users.id` ON DELETE CASCADE

**Unique Constraint:**
- `(subtask_id, user_id)` - Prevents duplicate assignments

**Indexes:**
- Primary key on `id`
- Index on `subtask_id` for efficient queries
- Index on `user_id` for efficient queries

---

### Social Posts Table

Stores generated and saved social media posts.

**Table Name:** `social_posts`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique post identifier |
| `user_id` | UUID | NOT NULL, FOREIGN KEY | User who created the post |
| `theme` | VARCHAR(200) | NOT NULL | Post theme/topic |
| `description` | TEXT | NULL | Additional description |
| `platform` | VARCHAR(50) | NOT NULL | Social media platform |
| `tonality` | VARCHAR(50) | NOT NULL | Post tonality/style |
| `language` | VARCHAR(10) | NOT NULL, DEFAULT 'en' | Post language code |
| `target_audience` | TEXT | NULL | Target audience description |
| `generated_variations` | JSONB | NULL | Array of generated variations |
| `selected_variation` | TEXT | NULL | User-selected variation |
| `media_url` | TEXT | NULL | URL or base64 data for media |
| `media_type` | VARCHAR(20) | NULL, CHECK | Type of media attachment |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Post creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Platform Values:**
- `Instagram`
- `Facebook`
- `Twitter`
- `LinkedIn`
- `TikTok`
- `YouTube`

**Tonality Values:**
- `Professional`
- `Casual`
- `Funny`
- `Inspirational`
- `Educational`
- `Energetic`

**Language Values:**
- `en` (English)
- `fr` (French)
- `es` (Spanish)
- `de` (German)
- `it` (Italian)

**Media Type Values:**
- `image`
- `video`
- `NULL` (no media)

**Foreign Key:**
- `user_id` → `users.id` ON DELETE CASCADE

**JSONB Structure (`generated_variations`):**
```json
[
  "First variation text",
  "Second variation text",
  "Third variation text"
]
```

**Indexes:**
- Primary key on `id`
- Index on `user_id` for efficient queries
- Index on `created_at` for sorting

---

### User Post Preferences Table

Stores user preferences for post generation (one-to-one with users).

**Table Name:** `user_post_preferences`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique preference identifier |
| `user_id` | UUID | NOT NULL, FOREIGN KEY, UNIQUE | User ID |
| `preferred_platforms` | JSONB | DEFAULT '[]'::jsonb | Array of preferred platforms |
| `preferred_tonalities` | JSONB | DEFAULT '[]'::jsonb | Array of preferred tonalities |
| `preferred_languages` | JSONB | DEFAULT '[]'::jsonb | Array of preferred languages |
| `common_themes` | JSONB | DEFAULT '[]'::jsonb | Array of frequently used themes |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Preference creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

**Foreign Key:**
- `user_id` → `users.id` ON DELETE CASCADE

**Unique Constraint:**
- `user_id` - One preference record per user

**JSONB Structure Examples:**

`preferred_platforms`:
```json
["Instagram", "Facebook", "Twitter"]
```

`preferred_tonalities`:
```json
["Professional", "Energetic"]
```

`preferred_languages`:
```json
["en", "fr"]
```

`common_themes`:
```json
["Gaming", "Technology", "Design"]
```

**Indexes:**
- Primary key on `id`
- Unique index on `user_id`

---

### Notifications Table

Stores user notifications for task-related events.

**Table Name:** `notifications`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique notification identifier |
| `user_id` | UUID | NOT NULL, FOREIGN KEY | User who receives the notification |
| `type` | VARCHAR(50) | NOT NULL, CHECK | Notification type |
| `message` | TEXT | NOT NULL | Notification message |
| `related_task_id` | UUID | NULL, FOREIGN KEY | Related task ID (if applicable) |
| `related_subtask_id` | UUID | NULL, FOREIGN KEY | Related subtask ID (if applicable) |
| `created_by_user_id` | UUID | NULL, FOREIGN KEY | User who triggered the notification |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT false | Read status |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Notification creation timestamp |

**Notification Types:**
- `task_created`: New task created
- `task_assigned`: Task assigned to user
- `subtask_assigned`: Subtask assigned to user

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE CASCADE
- `related_task_id` → `tasks.id` ON DELETE CASCADE
- `related_subtask_id` → `subtasks.id` ON DELETE CASCADE
- `created_by_user_id` → `users.id` ON DELETE SET NULL

**Indexes:**
- Primary key on `id`
- Index on `user_id` for efficient queries
- Index on `is_read` for filtering unread notifications
- Index on `created_at` for sorting

---

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       │                                     │
┌──────▼──────────┐              ┌───────────▼──────────┐
│ task_assignments│              │subtask_assignments   │
└──────┬──────────┘              └───────────┬──────────┘
       │                                     │
       │                                     │
┌──────▼──────┐                    ┌────────▼────────┐
│   tasks     │                    │    subtasks      │
└──────┬──────┘                    └────────┬────────┘
       │                                     │
       │                                     │
       └──────────────┬──────────────────────┘
                      │
                      │
              ┌───────▼────────┐
              │  notifications  │
              └─────────────────┘

┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├──────────────────────┐
       │                      │
       │                      │
┌──────▼──────────┐  ┌────────▼──────────────┐
│  social_posts    │  │user_post_preferences  │
└──────────────────┘  └───────────────────────┘
```

## Cascade Delete Behavior

When a parent record is deleted, related records are automatically deleted:

- **Delete User** → Deletes:
  - All task assignments
  - All subtask assignments
  - All social posts
  - User post preferences
  - All notifications (where user is recipient or creator)

- **Delete Task** → Deletes:
  - All subtasks (CASCADE)
  - All task assignments (CASCADE)
  - All related notifications (CASCADE)

- **Delete Subtask** → Deletes:
  - All subtask assignments (CASCADE)
  - All related notifications (CASCADE)

## Data Types

### UUID
- Generated using `gen_random_uuid()` or `uuid_generate_v4()`
- Format: `550e8400-e29b-41d4-a716-446655440000`

### TIMESTAMPTZ
- Timezone-aware timestamps
- Stored in UTC
- Format: ISO 8601 (e.g., `2024-01-01T00:00:00+00:00`)

### JSONB
- Binary JSON storage
- Efficient querying and indexing
- Used for flexible data structures (arrays, objects)

## Indexes Summary

| Table | Indexes |
|-------|---------|
| `users` | Primary key (`id`), Unique (`email`) |
| `tasks` | Primary key (`id`), Index (`created_at`) |
| `subtasks` | Primary key (`id`), Index (`task_id`) |
| `task_assignments` | Primary key (`id`), Index (`task_id`), Index (`user_id`), Unique (`task_id`, `user_id`) |
| `subtask_assignments` | Primary key (`id`), Index (`subtask_id`), Index (`user_id`), Unique (`subtask_id`, `user_id`) |
| `social_posts` | Primary key (`id`), Index (`user_id`), Index (`created_at`) |
| `user_post_preferences` | Primary key (`id`), Unique (`user_id`) |
| `notifications` | Primary key (`id`), Index (`user_id`), Index (`is_read`), Index (`created_at`) |

## Migration Notes

When modifying the schema:

1. **Add Columns**: Use `ALTER TABLE` with appropriate defaults
2. **Modify Constraints**: Drop and recreate constraints
3. **Add Indexes**: Use `CREATE INDEX CONCURRENTLY` for production
4. **Data Migration**: Plan for existing data when changing structures

## Backup and Recovery

- Regular backups recommended for production
- Use PostgreSQL's `pg_dump` for backups
- Test restore procedures regularly
- Consider point-in-time recovery (PITR) for critical data

