# Diabetes Workflow Companion

A web application that helps caregivers track patient data (meals, blood sugar readings, and insulin doses) and get AI-powered insulin recommendations with a single tap.

## 🎯 Purpose

This application streamlines diabetes management by:
- Enabling quick data entry for multiple patients
- Providing AI-generated insulin recommendations
- Presenting clean visual data formats
- Removing copy-paste friction
- Ensuring fast performance across all devices

## 🚀 Features

- **Multi-Patient Management**: Switch between patient profiles seamlessly
- **Quick Data Entry**: Record blood sugar, meals, and insulin doses with validation
- **AI Recommendations**: Get safe insulin dose recommendations with reasoning
- **Visual Analytics**: Timeline view and glucose charts with color bands
- **Safety Checks**: Warnings for significant dose changes
- **Mobile-First Design**: Optimized for touch devices and mobile number pads

## 🛠️ Tech Stack

- **Frontend**: Next.js (pages router), Material UI, React Hook Form, Zustand
- **Backend**: Next.js API routes, Prisma ORM with SQLite
- **Charts**: Recharts
- **AI Integration**: OpenAI 4o-mini or Anthropic Haiku
- **Containerization**: Docker with named volumes
- **Authentication**: JWT with bcrypt password hashing

## 📋 Prerequisites

- Node.js 18+ 
- Docker (for deployment)
- API key for OpenAI or Anthropic

## 🏃‍♂️ Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd diabetes-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="your-super-secret-jwt-key"
   MODEL_API_KEY="your-openai-or-anthropic-api-key"
   MODEL_NAME="openai-4o-mini"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Deployment

#### Option 1: Docker Deployment (Recommended)

1. **Build the Docker image**
   ```bash
   docker build -t diabetes-companion .
   ```

2. **Run the container**
   ```bash
   docker run -d \
       -p 80:3000 \
       -e MODEL_API_KEY=your_key \
       -e MODEL_NAME=openai-4o-mini \
       -e JWT_SECRET=supersecret \
       -v /opt/diabetes_data:/app/data \
       diabetes-companion
   ```

3. **Add TLS** (Optional)
   Use Caddy or Nginx as a reverse proxy for HTTPS.

#### Option 2: Direct Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
diabetes-manager/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── patients/        # Patient management components
│   ├── entries/         # Data entry components
│   ├── charts/          # Visualization components
│   └── common/          # Shared components
├── pages/               # Next.js pages and API routes
│   ├── api/             # API endpoints
│   ├── auth/            # Authentication pages
│   ├── patients/        # Patient management pages
│   └── dashboard/       # Main application pages
├── lib/                 # Utility functions and configurations
│   ├── auth.js          # Authentication utilities
│   ├── database.js      # Database configuration
│   ├── ai.js            # AI model integration
│   └── validation.js    # Data validation schemas
├── prisma/              # Database schema and migrations
├── public/              # Static assets
├── styles/              # Global styles and themes
├── store/               # Zustand state management
├── types/               # TypeScript type definitions
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose for development
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | SQLite database connection string | Yes | `file:./data/diabetes.db` |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `MODEL_API_KEY` | OpenAI or Anthropic API key | Yes | - |
| `MODEL_NAME` | AI model to use | Yes | `openai-4o-mini` |
| `NODE_ENV` | Environment mode | No | `development` |

### Database Schema

The application uses SQLite with the following main tables:
- `patients`: Patient profiles and medication preferences
- `entries`: Blood sugar readings, meals, and insulin doses
- `recommendations`: AI-generated recommendations and reasoning

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run all tests with coverage
npm run test:coverage
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new user account |
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/patients` | List all patients |
| POST | `/api/patients` | Create new patient |
| POST | `/api/entries` | Add new entry (glucose/meal/insulin) |
| PUT | `/api/entries/:id` | Update existing entry |
| DELETE | `/api/entries/:id` | Delete entry |
| POST | `/api/recommend` | Generate insulin recommendation |

## 🔒 Security Features

- HTTPS enforcement in production
- Bcrypt password hashing
- Parameterized SQL queries
- JWT token authentication
- Input validation and sanitization
- Rate limiting on API endpoints

## ♿ Accessibility

- WCAG AA color contrast compliance
- Full keyboard navigation support
- Screen reader compatibility
- Mobile-responsive design
- Touch-friendly interface

## 🌍 Internationalization

- Support for mg/dL and mmol/L units
- Configurable date/time formats
- Localized error messages

## 📈 Performance

- Recommendation response time: < 8 seconds
- 99% uptime target
- Optimized bundle size
- Efficient database queries
- Caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This application provides AI-generated recommendations for insulin dosing. These recommendations should be reviewed by qualified healthcare professionals before administration. The application is not a substitute for professional medical advice.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review the troubleshooting guide

## 🔄 Updates

- **v1.0.0**: Initial release with core functionality
- Future updates will include enhanced AI models, additional medication support, and improved analytics 