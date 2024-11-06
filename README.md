# AI Task Manager

A modern task management application with AI assistance for task creation and management. Features a Kanban-style board with drag-and-drop functionality, AI-powered task generation, and smart task management capabilities.

## Tech Stack

### Frontend
- React 18 with hooks
- Vite for fast development and building
- Tailwind CSS for styling
- Lucide Icons for UI elements
- Canvas Confetti for celebrations

### Backend
- Node.js
- Express.js for API routing
- PostgreSQL 16 for data persistence
- Custom database migrations

### Development & Deployment
- Docker and Docker Compose for containerization
- Environment variables management
- Git for version control

## Prerequisites

Before you begin, ensure you have:
- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git
- OpenAI API key and/or Anthropic API key

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Copy the environment example file:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

4. Start the application using Docker:
```bash
docker-compose up --build
```

The application will be available at:
- Web Application: http://localhost:3000
- Database: localhost:5432

## Development

### Local Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

### Database Migrations

Migrations are automatically run when the container starts. They can be found in the `/migrations` directory:
- `001_initial_schema.sql`: Sets up the base tables
- `002_add_task_position.sql`: Adds position tracking for tasks

### Key Features

1. **AI Task Management**
   - Natural language task creation
   - Smart task assignment
   - Bulk task operations

2. **Kanban Board**
   - Drag-and-drop task management
   - Real-time position updates
   - Task status tracking

3. **User Management**
   - Task assignment
   - User avatars
   - Team collaboration

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task(s)
- `PUT /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task

### Users
- `GET /api/users` - Get all users

### API Keys
- `POST /api/keys` - Update API keys
- `GET /api/keys` - Get masked API keys
- `GET /api/keys/test` - Test API key configuration

## Docker Configuration

The application uses two main services:
1. `web`: The Node.js application
2. `db`: PostgreSQL database

Key configurations:
- Hot reload enabled for development
- Persistent database volume
- Health checks for both services
- Automatic database initialization

## Troubleshooting

1. **Database Connection Issues**
   - Check if PostgreSQL container is running: `docker ps`
   - Verify database credentials in `.env`
   - Check database logs: `docker-compose logs db`

2. **API Key Issues**
   - Ensure API keys are properly set in `.env`
   - Check API key validity in settings modal
   - Verify environment variable loading

3. **Development Server Issues**
   - Clear node_modules: `rm -rf node_modules`
   - Rebuild containers: `docker-compose up --build`
   - Check logs: `docker-compose logs web`

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
