#!/bin/bash

# Diabetes Workflow Companion Deployment Script
# This script automates the deployment process for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Check environment variables
check_environment() {
    print_status "Checking environment variables..."
    
    if [ -z "$MODEL_API_KEY" ]; then
        print_error "MODEL_API_KEY environment variable is not set"
        print_warning "Please set your OpenAI or Anthropic API key:"
        print_warning "export MODEL_API_KEY=your_api_key_here"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        print_warning "JWT_SECRET not set, generating a random one..."
        export JWT_SECRET=$(openssl rand -base64 32)
        print_success "Generated JWT_SECRET: $JWT_SECRET"
    fi
    
    if [ -z "$MODEL_NAME" ]; then
        export MODEL_NAME="openai-4o-mini"
        print_status "Using default model: $MODEL_NAME"
    fi
    
    print_success "Environment variables configured"
}

# Create necessary directories
setup_directories() {
    print_status "Setting up directories..."
    
    mkdir -p data
    mkdir -p ssl
    mkdir -p logs
    
    print_success "Directories created"
}

# Generate self-signed SSL certificate (for development)
generate_ssl_cert() {
    print_status "Generating SSL certificate..."
    
    if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        print_success "SSL certificate generated"
    else
        print_status "SSL certificate already exists"
    fi
}

# Build and start the application
deploy_application() {
    print_status "Building and deploying the application..."
    
    # Build the Docker image
    print_status "Building Docker image..."
    docker-compose build
    
    # Start the services
    print_status "Starting services..."
    docker-compose up -d
    
    print_success "Application deployed successfully"
}

# Wait for application to be ready
wait_for_application() {
    print_status "Waiting for application to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
            print_success "Application is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Application not ready yet, waiting..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_error "Application failed to start within the expected time"
    return 1
}

# Display deployment information
show_deployment_info() {
    print_success "Deployment completed successfully!"
    echo
    echo "Application Information:"
    echo "======================="
    echo "URL: https://localhost"
    echo "HTTP URL: http://localhost (redirects to HTTPS)"
    echo "API Health Check: https://localhost/api/health"
    echo
    echo "Docker Services:"
    echo "==============="
    docker-compose ps
    echo
    echo "Logs:"
    echo "====="
    echo "View logs: docker-compose logs -f"
    echo "View app logs: docker-compose logs -f diabetes-companion"
    echo
    echo "Management Commands:"
    echo "==================="
    echo "Stop: docker-compose down"
    echo "Restart: docker-compose restart"
    echo "Update: docker-compose pull && docker-compose up -d"
    echo "Remove: docker-compose down -v"
}

# Main deployment function
main() {
    echo "Diabetes Workflow Companion - Deployment Script"
    echo "=============================================="
    echo
    
    check_prerequisites
    check_environment
    setup_directories
    generate_ssl_cert
    deploy_application
    
    if wait_for_application; then
        show_deployment_info
    else
        print_error "Deployment failed. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "stop")
        print_status "Stopping application..."
        docker-compose down
        print_success "Application stopped"
        ;;
    "restart")
        print_status "Restarting application..."
        docker-compose restart
        print_success "Application restarted"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "update")
        print_status "Updating application..."
        docker-compose pull
        docker-compose up -d
        print_success "Application updated"
        ;;
    "clean")
        print_status "Cleaning up..."
        docker-compose down -v
        docker system prune -f
        print_success "Cleanup completed"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  (no args)  Deploy the application"
        echo "  stop       Stop the application"
        echo "  restart    Restart the application"
        echo "  logs       Show application logs"
        echo "  update     Update and restart the application"
        echo "  clean      Stop and remove all containers and volumes"
        echo "  help       Show this help message"
        ;;
    *)
        main
        ;;
esac 