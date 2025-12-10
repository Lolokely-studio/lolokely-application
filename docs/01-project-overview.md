# Project Overview

## Introduction

Lolokely is a comprehensive full-stack web application designed to streamline team collaboration and social media content creation. The application combines task management functionality similar to Monday.com with an AI-powered social media post generator, making it a versatile tool for teams managing projects and content creation.

## Project Goals

1. **Task Management**: Provide a robust task management system with hierarchical task structures (tasks and subtasks)
2. **Team Collaboration**: Enable seamless task assignment and tracking across team members
3. **Content Creation**: Leverage AI to generate engaging social media posts tailored to different platforms and audiences
4. **User Experience**: Deliver a modern, responsive interface with intuitive navigation
5. **Scalability**: Build a foundation that can scale with growing teams and content needs

## Core Features

### 1. Task Management System

#### Task Operations
- **Create Tasks**: Users can create tasks with titles, descriptions, priorities, and due dates
- **Update Tasks**: Modify task details, status, and priority levels
- **Delete Tasks**: Remove tasks when no longer needed
- **Task Status**: Track progress through three states:
  - `todo`: Task is pending
  - `in_progress`: Task is actively being worked on
  - `completed`: Task is finished

#### Subtask Support
- **Hierarchical Structure**: Create subtasks within parent tasks
- **Independent Management**: Subtasks have their own status, priority, and due dates
- **Cascade Operations**: Subtasks are automatically deleted when parent task is deleted

#### Task Assignment
- **Multi-User Assignment**: Assign tasks and subtasks to multiple team members
- **Assignment Tracking**: Track who assigned tasks and when
- **Notification System**: Automatic notifications when tasks are assigned

#### Priority Levels
- **Low**: Non-urgent tasks
- **Medium**: Standard priority (default)
- **High**: Urgent tasks requiring immediate attention

### 2. Social Media Post Generator

#### AI-Powered Generation
- **Google Gemini Integration**: Uses Google's Gemini 2.5 Flash model for content generation
- **Multiple Variations**: Generates 3 different post variations for each request
- **Platform-Specific**: Tailored content for different social media platforms

#### Supported Platforms
- Instagram
- Facebook
- Twitter
- LinkedIn
- TikTok
- YouTube

#### Customization Options
- **Tonality**: Choose from:
  - Professional
  - Casual
  - Funny
  - Inspirational
  - Educational
  - Energetic
- **Language Support**: 
  - English (en)
  - French (fr)
  - Spanish (es)
  - German (de)
  - Italian (it)
- **Target Audience**: Specify audience demographics and interests
- **Media Attachments**: Add images or videos to posts

#### Post Management
- **Post History**: View all generated and saved posts
- **Variation Selection**: Choose preferred variation from generated options
- **Post Metadata**: Track platform, tonality, language, and creation date
- **User Preferences**: System learns from user choices to improve future suggestions

### 3. Notification System

#### Notification Types
- **Task Created**: Notify all users when a new task is created
- **Task Assigned**: Notify users when they are assigned to a task
- **Subtask Assigned**: Notify users when they are assigned to a subtask

#### Notification Features
- **Read/Unread Status**: Track notification read status
- **Bulk Actions**: Mark all notifications as read
- **Real-time Updates**: Notifications appear in real-time
- **User Context**: Shows who created or assigned the task

### 4. User Management

#### Authentication
- **Registration**: Create new user accounts with email and password
- **Login**: Secure authentication with JWT tokens
- **Session Management**: Persistent sessions with JWT tokens
- **Password Security**: Bcrypt hashing for password storage

#### User Profiles
- **User Information**: First name, last name, email
- **User Preferences**: Track preferred platforms, tonalities, languages, and themes
- **Activity Tracking**: Timestamps for account creation and updates

## Technical Architecture

### Backend Architecture
- **RESTful API**: Flask-based REST API with clear endpoint structure
- **Database**: PostgreSQL with UUID primary keys
- **Authentication**: JWT-based stateless authentication
- **Validation**: Marshmallow schemas for data validation
- **Error Handling**: Comprehensive error handling and logging

### Frontend Architecture
- **Component-Based**: React components with clear separation of concerns
- **State Management**: Context API for global state (Auth, Theme, Sidebar)
- **Service Layer**: Centralized API service functions
- **Responsive Design**: Mobile-first responsive design with Tailwind CSS
- **Routing**: Client-side routing with React Router

## User Interface

### Design Principles
- **Modern UI**: Clean, minimalist design with Tailwind CSS
- **Dark/Light Theme**: Theme switching support for user preference
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Intuitive Navigation**: Sidebar navigation with collapsible menu
- **Visual Feedback**: Loading states, success/error messages

### Key UI Components
- **Dashboard**: Overview of tasks and recent activity
- **Task Cards**: Visual representation of tasks with status indicators
- **Post Generator**: Form-based interface for post generation
- **Post History**: Timeline view of all generated posts
- **Notification Bell**: Real-time notification indicator

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for password security
- **CORS Configuration**: Controlled cross-origin resource sharing
- **Input Validation**: Server-side validation with Marshmallow
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: React's built-in escaping

## Future Enhancements

Potential areas for future development:
- Real-time collaboration features
- File attachments for tasks
- Advanced filtering and search
- Analytics and reporting
- Integration with external tools
- Mobile applications
- Advanced AI features for task suggestions

## Project Status

The application is currently in active development with core features implemented and functional. The system supports:
- ✅ User authentication and authorization
- ✅ Task and subtask management
- ✅ Task assignment and notifications
- ✅ AI-powered post generation
- ✅ Post history and preferences
- ✅ Responsive user interface

## License

This project is licensed under the MIT License.

