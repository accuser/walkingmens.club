#!/bin/bash

# Database setup script for Walking Mens Club
# This script helps set up the Cloudflare D1 database for development and production

set -e

echo "🚀 Setting up Cloudflare D1 Database for Walking Mens Club"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI is not installed. Please install it first:${NC}"
    echo "npm install -g wrangler"
    exit 1
fi

# Function to create database
create_database() {
    local env_name=$1
    local db_name=$2
    
    echo -e "${YELLOW}📦 Creating D1 database: $db_name${NC}"
    
    # Create the database and capture the output
    output=$(wrangler d1 create "$db_name" 2>&1)
    
    if [[ $output == *"database_id"* ]]; then
        # Extract database ID from output
        database_id=$(echo "$output" | grep -o '"database_id": "[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅ Database created successfully!${NC}"
        echo -e "${YELLOW}📝 Database ID: $database_id${NC}"
        echo -e "${YELLOW}🔧 Please update wrangler.jsonc with this database ID for $env_name environment${NC}"
        echo ""
    else
        echo -e "${RED}❌ Failed to create database: $db_name${NC}"
        echo "$output"
        return 1
    fi
}

# Function to apply schema
apply_schema() {
    local db_name=$1
    local local_flag=$2
    
    echo -e "${YELLOW}📋 Applying database schema to: $db_name${NC}"
    
    if [ "$local_flag" = "--local" ]; then
        echo -e "${YELLOW}🏠 Applying to local database${NC}"
        wrangler d1 execute "$db_name" --local --file=./database/schema.sql
    else
        echo -e "${YELLOW}☁️ Applying to remote database${NC}"
        wrangler d1 execute "$db_name" --file=./database/schema.sql
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Schema applied successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to apply schema${NC}"
        return 1
    fi
}

# Main menu
echo "Please select an option:"
echo "1) Create production database"
echo "2) Create development database"
echo "3) Apply schema to local database"
echo "4) Apply schema to remote database"
echo "5) Setup everything (create both databases)"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        create_database "production" "walking-mens-club-db"
        ;;
    2)
        create_database "development" "walking-mens-club-db-dev"
        ;;
    3)
        read -p "Enter database name: " db_name
        apply_schema "$db_name" "--local"
        ;;
    4)
        read -p "Enter database name: " db_name
        apply_schema "$db_name"
        ;;
    5)
        echo -e "${YELLOW}🔄 Setting up both databases...${NC}"
        create_database "production" "walking-mens-club-db"
        create_database "development" "walking-mens-club-db-dev"
        echo -e "${GREEN}✅ All databases created!${NC}"
        echo -e "${YELLOW}📝 Don't forget to update the database IDs in wrangler.jsonc${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Database setup completed!${NC}"
echo -e "${YELLOW}📚 Next steps:${NC}"
echo "1. Update wrangler.jsonc with the actual database IDs"
echo "2. Apply the schema using the script or manually with wrangler d1 execute"
echo "3. Start implementing the database service layer"