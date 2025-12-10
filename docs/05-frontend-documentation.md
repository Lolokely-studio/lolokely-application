# Frontend Documentation

## Overview

The Lolokely frontend is built with **React 19** and **Vite**, providing a modern, responsive user interface. The application uses a component-based architecture with Context API for state management and Tailwind CSS for styling.

## Technology Stack

- **React 19.1.1**: UI library
- **Vite 7.1.7**: Build tool and dev server
- **React Router 7.9.4**: Client-side routing
- **Axios 1.13.0**: HTTP client
- **Tailwind CSS 4.1.16**: Utility-first CSS framework
- **Lucide React 0.548.0**: Icon library

## Project Structure

```
frontend/
├── public/                 # Static assets
│   └── vite.svg
├── src/
│   ├── assets/            # Images and static files
│   │   ├── lolokely-logo.png
│   │   └── react.svg
│   ├── components/        # React components
│   │   ├── AssignModal.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Jobs.jsx
│   │   ├── LoginForm.jsx
│   │   ├── Navbar.jsx
│   │   ├── NotificationBell.jsx
│   │   ├── PostGenerator.jsx
│   │   ├── PostHistory.jsx
│   │   ├── RegisterForm.jsx
│   │   ├── SubtaskCard.jsx
│   │   ├── SubtaskForm.jsx
│   │   ├── TaskCard.jsx
│   │   ├── TaskForm.jsx
│   │   ├── UserAvatar.jsx
│   │   └── UserList.jsx
│   ├── contexts/          # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── SidebarContext.jsx
│   │   └── ThemeContext.jsx
│   ├── services/          # API service functions
│   │   ├── api.js
│   │   ├── notificationService.js
│   │   ├── postService.js
│   │   └── taskService.js
│   ├── App.jsx            # Main application component
│   ├── App.css            # Application styles
│   ├── index.css          # Global styles
│   └── main.jsx           # Application entry point
├── index.html             # HTML template
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
└── postcss.config.js      # PostCSS configuration
```

## Application Entry Point

### `main.jsx`

The application entry point that renders the root component:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### `App.jsx`

Main application component with routing and context providers:

**Key Features:**
- Theme provider for dark/light mode
- Authentication context for user state
- Sidebar context for navigation state
- Protected routes requiring authentication
- Layout wrapper with navbar and notifications

**Route Structure:**
- `/login` - Public login page
- `/register` - Public registration page
- `/dashboard` - Protected dashboard
- `/jobs` - Protected jobs page
- `/posts` - Protected post generator
- `/posts/history` - Protected post history

## Context Providers

### AuthContext

Manages authentication state and user session.

**State:**
- `isAuthenticated`: Boolean indicating if user is logged in
- `user`: Current user object
- `token`: JWT token
- `loading`: Loading state
- `error`: Error message

**Methods:**
- `login(credentials)`: Authenticate user
- `register(userData)`: Register new user
- `logout()`: Clear session and log out

**Features:**
- Session persistence via localStorage
- Inactivity timeout (30 minutes)
- Automatic token validation
- Activity tracking (mouse, keyboard, scroll events)

**Usage:**
```jsx
import { useAuth } from './contexts/AuthContext';

const MyComponent = () => {
  const { isAuthenticated, user, login, logout } = useAuth();
  // ...
};
```

### ThemeContext

Manages application theme (light/dark mode).

**State:**
- `theme`: Current theme ('light' or 'dark')

**Methods:**
- `toggleTheme()`: Switch between themes

**Usage:**
```jsx
import { useTheme } from './contexts/ThemeContext';

const MyComponent = () => {
  const { theme, toggleTheme } = useTheme();
  // ...
};
```

### SidebarContext

Manages sidebar collapse/expand state.

**State:**
- `isCollapsed`: Boolean indicating if sidebar is collapsed

**Methods:**
- `toggleSidebar()`: Toggle sidebar state

**Usage:**
```jsx
import { useSidebar } from './contexts/SidebarContext';

const MyComponent = () => {
  const { isCollapsed, toggleSidebar } = useSidebar();
  // ...
};
```

## Service Layer

### API Service (`api.js`)

Centralized Axios instance with interceptors.

**Features:**
- Base URL configuration from environment variables
- Automatic token injection in Authorization header
- 401 error handling with automatic logout
- Request/response interceptors

**Configuration:**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

**Token Interceptor:**
- Automatically adds `Authorization: Bearer <token>` header
- Retrieves token from localStorage

**Error Interceptor:**
- Handles 401 (Unauthorized) errors
- Clears localStorage and redirects to login

### Task Service (`taskService.js`)

API functions for task management:

- `getTasks()`: Fetch all tasks
- `createTask(taskData)`: Create new task
- `updateTask(taskId, taskData)`: Update task
- `deleteTask(taskId)`: Delete task
- `assignTask(taskId, userIds)`: Assign task to users
- `createSubtask(taskId, subtaskData)`: Create subtask
- `updateSubtask(subtaskId, subtaskData)`: Update subtask
- `deleteSubtask(subtaskId)`: Delete subtask
- `assignSubtask(subtaskId, userIds)`: Assign subtask

### Post Service (`postService.js`)

API functions for post generation:

- `generatePosts(postData)`: Generate post variations
- `savePost(postData)`: Save generated post
- `getPosts()`: Fetch all posts
- `getPreferences()`: Get user preferences

### Notification Service (`notificationService.js`)

API functions for notifications:

- `getNotifications()`: Fetch user notifications
- `getUnreadCount()`: Get unread notification count
- `markAsRead(notificationId)`: Mark notification as read
- `markAllAsRead()`: Mark all notifications as read

## Components

### Authentication Components

#### LoginForm

User login form component.

**Features:**
- Email and password input
- Form validation
- Error message display
- Redirect to dashboard on success

#### RegisterForm

User registration form component.

**Features:**
- Email, password, first name, last name inputs
- Form validation
- Password confirmation
- Error message display
- Auto-login after registration

### Navigation Components

#### Navbar

Main navigation sidebar component.

**Features:**
- Collapsible sidebar
- Navigation links (Dashboard, Jobs, Posts, Post History)
- User avatar and logout button
- Responsive design (hidden on mobile)
- Active route highlighting

**Routes:**
- Dashboard
- Jobs
- Post Generator
- Post History

#### NotificationBell

Notification indicator component.

**Features:**
- Unread count badge
- Notification dropdown
- Mark as read functionality
- Real-time updates
- Fixed position (top right)

### Task Management Components

#### Dashboard

Main dashboard component displaying tasks.

**Features:**
- Task list display
- Task creation form
- Task filtering and sorting
- Task status indicators
- Responsive grid layout

#### TaskCard

Individual task display component.

**Features:**
- Task details (title, description, status, priority)
- Due date display
- Assignment indicators
- Subtask list
- Edit/delete actions
- Status update dropdown

#### TaskForm

Form for creating/editing tasks.

**Fields:**
- Title (required)
- Description
- Status (todo, in_progress, completed)
- Priority (low, medium, high)
- Due date

#### SubtaskCard

Individual subtask display component.

**Features:**
- Subtask details
- Status and priority
- Assignment indicators
- Edit/delete actions

#### SubtaskForm

Form for creating/editing subtasks.

**Fields:**
- Title (required)
- Description
- Status
- Priority
- Due date

#### AssignModal

Modal for assigning tasks/subtasks to users.

**Features:**
- User list with checkboxes
- Multi-select assignment
- Search/filter users
- Save and cancel actions

### Post Generation Components

#### PostGenerator

Main component for generating social media posts.

**Features:**
- Form for post parameters:
  - Theme (required)
  - Description
  - Platform selection
  - Tonality selection
  - Language selection
  - Target audience
- Generate button
- Display of 3 generated variations
- Variation selection
- Media upload (image/video)
- Save post functionality

**Supported Platforms:**
- Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube

**Supported Tonalities:**
- Professional, Casual, Funny, Inspirational, Educational, Energetic

**Supported Languages:**
- English, French, Spanish, German, Italian

#### PostHistory

Component displaying all saved posts.

**Features:**
- Post list with metadata
- Expandable post cards
- View all variations
- Copy to clipboard
- Filter by platform/tonality
- Date sorting

### Utility Components

#### UserAvatar

User avatar display component.

**Features:**
- Initials fallback
- Profile picture support
- Size variants

#### UserList

List of users for assignment.

**Features:**
- User cards with names
- Checkbox selection
- Search functionality

## Routing

### Route Configuration

Routes are defined in `App.jsx` using React Router:

```jsx
<Routes>
  <Route path="/login" element={<LoginForm />} />
  <Route path="/register" element={<RegisterForm />} />
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <LayoutWrapper>
        <Dashboard />
      </LayoutWrapper>
    </ProtectedRoute>
  } />
  {/* ... more routes */}
</Routes>
```

### Protected Routes

Protected routes require authentication:

```jsx
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};
```

### Layout Wrapper

Layout wrapper provides consistent structure:

- Navbar sidebar
- Notification bell
- Main content area
- Responsive margin based on sidebar state

## Styling

### Tailwind CSS

The application uses Tailwind CSS for styling:

- **Utility Classes**: Rapid UI development
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Theme-aware styling
- **Custom Colors**: Brand color palette

### Theme Configuration

Tailwind config includes:
- Custom color palette
- Font configuration
- Spacing scale
- Breakpoints

### CSS Files

- **`index.css`**: Global styles and Tailwind directives
- **`App.css`**: Application-specific styles

## State Management Patterns

### Local State

Components use `useState` for local state:

```jsx
const [tasks, setTasks] = useState([]);
const [loading, setLoading] = useState(false);
```

### Context State

Global state managed via Context API:

- Authentication state
- Theme preferences
- Sidebar state

### Server State

Server state managed through:
- API service calls
- Component-level state
- useEffect hooks for data fetching

## Form Handling

### Controlled Components

All forms use controlled components:

```jsx
const [formData, setFormData] = useState({
  title: '',
  description: '',
  // ...
});

const handleChange = (e) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value
  });
};
```

### Form Validation

- Client-side validation
- Error message display
- Required field indicators
- Server-side validation feedback

## Error Handling

### API Error Handling

```jsx
try {
  const response = await taskService.createTask(data);
  // Success handling
} catch (error) {
  // Error handling
  const errorMessage = error.response?.data?.error || 'An error occurred';
  setError(errorMessage);
}
```

### Error Display

- Error messages in forms
- Toast notifications (if implemented)
- Console logging for debugging

## Performance Optimization

### Code Splitting

- Route-based code splitting via React Router
- Lazy loading for heavy components

### Memoization

- `useCallback` for function memoization
- `useMemo` for computed values
- React.memo for component memoization

### Optimization Techniques

- Efficient re-renders
- Debounced search inputs
- Pagination for large lists
- Image optimization

## Environment Variables

### Configuration

Create `.env` file in frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### Usage

```javascript
const API_URL = import.meta.env.VITE_API_URL;
```

## Build and Deployment

### Development

```bash
npm run dev
```

Starts Vite dev server on `http://localhost:5173`

### Production Build

```bash
npm run build
```

Creates optimized production build in `dist/` directory.

### Preview

```bash
npm run preview
```

Preview production build locally.

## Best Practices

### Component Structure

- Single responsibility principle
- Reusable components
- Props validation
- Clear component naming

### Code Organization

- Feature-based file structure
- Consistent naming conventions
- Clear separation of concerns

### Accessibility

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Screen reader compatibility

## Testing (Future)

Consider implementing:
- Unit tests (Jest, React Testing Library)
- Integration tests
- E2E tests (Cypress, Playwright)
- Component snapshot tests

