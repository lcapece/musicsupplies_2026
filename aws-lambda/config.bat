@echo off
REM ============================================
REM CRITICAL: EDIT THESE VALUES BEFORE RUNNING
REM ============================================

REM SQL Server Configuration
set SQL_HOST=172.31.66.246
set SQL_PORT=1433
set SQL_USER=dbox
set SQL_PASSWORD=Monday123$
set SQL_DATABASE=LCMD_DB

REM AWS VPC Configuration (where your SQL Server EC2 lives)
REM Using default VPC for us-east-1 (172.31.0.0/16 range matches your EC2)
set VPC_ID=default
set SUBNET_ID_1=default
set SUBNET_ID_2=default
set SECURITY_GROUP_ID=default

REM AWS Region
set REGION=us-east-1

REM ============================================
REM HOW TO GET THESE VALUES:
REM ============================================
REM
REM 1. SQL_HOST:
REM    Run: aws ec2 describe-instances --filters "Name=tag:Name,Values=*sql*" --query "Reservations[*].Instances[*].PrivateIpAddress"
REM    Or check EC2 console for your SQL Server instance's private IP
REM
REM 2. VPC_ID:
REM    Run: aws ec2 describe-vpcs --query "Vpcs[*].[VpcId,Tags[?Key=='Name'].Value]"
REM    Choose the VPC where SQL Server is located
REM
REM 3. SUBNET_IDs:
REM    Run: aws ec2 describe-subnets --filters "Name=vpc-id,Values=YOUR_VPC_ID" --query "Subnets[*].[SubnetId,Tags[?Key=='Name'].Value,AvailabilityZone]"
REM    Choose 2 private subnets (need at least 2 for Lambda in VPC)
REM
REM 4. SECURITY_GROUP_ID:
REM    Run: aws ec2 describe-security-groups --filters "Name=vpc-id,Values=YOUR_VPC_ID" --query "SecurityGroups[*].[GroupId,GroupName,Description]"
REM    Choose the one associated with SQL Server or create a new one
REM
REM ============================================