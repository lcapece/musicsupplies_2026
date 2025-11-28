#!/bin/bash

# Supabase Utility Script - Better than broken MCP!
# Usage: ./supa-util.sh [command] [args...]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Get DB URL
get_db_url() {
    if [ -z "$SUPABASE_DB_URL" ]; then
        echo "postgresql://postgres:Jg44m6F76SYdTqB6@127.0.0.1:54322/postgres"
    else
        echo "$SUPABASE_DB_URL"
    fi
}

# Show help
show_help() {
    echo "Supabase Utility Script - Your reliable Supabase toolkit!"
    echo ""
    echo "DATABASE OPERATIONS:"
    echo "  query 'SQL'           - Execute SQL query"
    echo "  reset                 - Reset database with migrations"
    echo "  migrate               - Apply pending migrations"
    echo "  status                - Show Supabase status"
    echo "  start                 - Start Supabase locally"
    echo "  stop                  - Stop Supabase locally"
    echo ""
    echo "FUNCTION OPERATIONS:"
    echo "  func-list             - List all functions"
    echo "  func-deploy [name]    - Deploy function"
    echo "  func-logs [name]      - Watch function logs"
    echo "  func-delete [name]    - Delete function"
    echo ""
    echo "TABLE OPERATIONS:"
    echo "  tables                - List all tables"
    echo "  describe [table]      - Describe table structure"
    echo "  count [table]         - Count rows in table"
    echo "  sample [table] [n]    - Show n sample rows"
    echo ""
    echo "USER/AUTH OPERATIONS:"
    echo "  users                 - List all users"
    echo "  user-create [email]   - Create new user"
    echo "  user-delete [id]      - Delete user"
    echo ""
    echo "UTILITY OPERATIONS:"
    echo "  backup                - Create database backup"
    echo "  restore [file]        - Restore from backup"
    echo "  health                - Check system health"
    echo ""
}

# Database operations
db_query() {
    local sql="$1"
    if [ -z "$sql" ]; then
        log_error "SQL query required"
        exit 1
    fi
    log_info "Executing query..."
    psql "$(get_db_url)" -c "$sql"
    log_success "Query completed"
}

db_reset() {
    log_info "Resetting database..."
    supabase db reset --local
    log_success "Database reset completed"
}

db_migrate() {
    log_info "Applying migrations..."
    supabase db push --local
    log_success "Migrations applied"
}

db_status() {
    log_info "Checking Supabase status..."
    supabase status
}

db_start() {
    log_info "Starting Supabase..."
    supabase start
    log_success "Supabase started"
}

db_stop() {
    log_info "Stopping Supabase..."
    supabase stop
    log_success "Supabase stopped"
}

# Function operations
func_list() {
    log_info "Listing functions..."
    supabase functions list
}

func_deploy() {
    local name="$1"
    if [ -z "$name" ]; then
        log_error "Function name required"
        exit 1
    fi
    log_info "Deploying function: $name"
    supabase functions deploy "$name"
    log_success "Function deployed: $name"
}

func_logs() {
    local name="$1"
    if [ -z "$name" ]; then
        log_info "Watching all function logs..."
        supabase functions logs --follow
    else
        log_info "Watching logs for: $name"
        supabase functions logs "$name" --follow
    fi
}

func_delete() {
    local name="$1"
    if [ -z "$name" ]; then
        log_error "Function name required"
        exit 1
    fi
    log_warn "Deleting function: $name"
    supabase functions delete "$name"
    log_success "Function deleted: $name"
}

# Table operations
list_tables() {
    log_info "Listing all tables..."
    psql "$(get_db_url)" -c "\dt"
}

describe_table() {
    local table="$1"
    if [ -z "$table" ]; then
        log_error "Table name required"
        exit 1
    fi
    log_info "Describing table: $table"
    psql "$(get_db_url)" -c "\d $table"
}

count_table() {
    local table="$1"
    if [ -z "$table" ]; then
        log_error "Table name required"
        exit 1
    fi
    log_info "Counting rows in: $table"
    psql "$(get_db_url)" -c "SELECT COUNT(*) FROM $table;"
}

sample_table() {
    local table="$1"
    local limit="${2:-10}"
    if [ -z "$table" ]; then
        log_error "Table name required"
        exit 1
    fi
    log_info "Showing $limit sample rows from: $table"
    psql "$(get_db_url)" -c "SELECT * FROM $table LIMIT $limit;"
}

# User operations
list_users() {
    log_info "Listing all users..."
    psql "$(get_db_url)" -c "SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;"
}

create_user() {
    local email="$1"
    if [ -z "$email" ]; then
        log_error "Email required"
        exit 1
    fi
    log_info "Creating user: $email"
    psql "$(get_db_url)" -c "INSERT INTO auth.users (email) VALUES ('$email');"
    log_success "User created: $email"
}

delete_user() {
    local user_id="$1"
    if [ -z "$user_id" ]; then
        log_error "User ID required"
        exit 1
    fi
    log_warn "Deleting user: $user_id"
    psql "$(get_db_url)" -c "DELETE FROM auth.users WHERE id = '$user_id';"
    log_success "User deleted: $user_id"
}

# Utility operations
backup_db() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="backup_$timestamp.sql"
    log_info "Creating backup: $backup_file"
    pg_dump "$(get_db_url)" > "$backup_file"
    log_success "Backup created: $backup_file"
}

restore_db() {
    local backup_file="$1"
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        log_error "Valid backup file required"
        exit 1
    fi
    log_warn "Restoring from: $backup_file"
    psql "$(get_db_url)" < "$backup_file"
    log_success "Database restored from: $backup_file"
}

check_health() {
    log_info "Checking system health..."
    echo "Supabase Status:"
    supabase status 2>/dev/null || log_error "Supabase not running"
    echo ""
    echo "Database Connection:"
    psql "$(get_db_url)" -c "SELECT version();" 2>/dev/null && log_success "Database connected" || log_error "Database connection failed"
    echo ""
    echo "Disk Usage:"
    df -h . 2>/dev/null || log_warn "Could not check disk usage"
}

# Main command handler
case "${1:-help}" in
    # Database operations
    "query")        db_query "$2" ;;
    "reset")        db_reset ;;
    "migrate")      db_migrate ;;
    "status")       db_status ;;
    "start")        db_start ;;
    "stop")         db_stop ;;
    
    # Function operations
    "func-list")    func_list ;;
    "func-deploy")  func_deploy "$2" ;;
    "func-logs")    func_logs "$2" ;;
    "func-delete")  func_delete "$2" ;;
    
    # Table operations
    "tables")       list_tables ;;
    "describe")     describe_table "$2" ;;
    "count")        count_table "$2" ;;
    "sample")       sample_table "$2" "$3" ;;
    
    # User operations
    "users")        list_users ;;
    "user-create")  create_user "$2" ;;
    "user-delete")  delete_user "$2" ;;
    
    # Utility operations
    "backup")       backup_db ;;
    "restore")      restore_db "$2" ;;
    "health")       check_health ;;
    
    # Help
    "help"|*)       show_help ;;
esac