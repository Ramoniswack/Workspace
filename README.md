# TaskFlow Frontend

A modern project management application built with Next.js, featuring task management, real-time collaboration, and team workspace organization.

## Features

- **Workspace Management** - Create and manage multiple workspaces with team members
- **Task Organization** - Kanban boards, list views, and Gantt charts for task visualization
- **Real-time Chat** - Built-in messaging system for team communication
- **Document Editor** - Rich text editor powered by TipTap for collaborative documentation
- **Activity Tracking** - Monitor workspace activity and task updates
- **Notifications** - Stay updated with real-time notifications
- **Customizable Themes** - Dark/light mode with custom theme options
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: Redux Toolkit, Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: @dnd-kit, @hello-pangea/dnd
- **Rich Text Editor**: TipTap
- **Real-time**: Socket.io Client
- **Charts**: Recharts, Frappe Gantt
- **Authentication**: Firebase

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=your_api_url
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── workspace/         # Workspace-related pages
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Authentication pages
│   └── ...
├── components/            # React components
│   ├── chat/             # Chat system components
│   ├── kanban/           # Kanban board components
│   ├── list-view/        # List view components
│   ├── gantt/            # Gantt chart components
│   ├── sidebar/          # Navigation sidebar
│   ├── tasks/            # Task management components
│   ├── ui/               # Reusable UI components
│   └── ...
├── lib/                   # Utility functions and configurations
├── hooks/                 # Custom React hooks
├── store/                 # Redux store configuration
└── types/                 # TypeScript type definitions
```

## Key Features Implementation

### Workspace Hierarchy
- Workspaces → Spaces → Lists → Tasks
- Recursive sidebar navigation with collapsible sections
- Member management at workspace, space, and list levels

### Task Management
- Multiple views: Kanban, List, Gantt
- Inline task creation
- Task details sidebar with comments and activity
- Time tracking and assignee management
- Status and priority management

### Real-time Features
- Live chat with emoji support
- Real-time notifications
- Socket.io integration for instant updates

### Document Management
- Rich text editor with tables, images, and links
- Document organization within workspaces
- Collaborative editing capabilities

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## License

ISC
