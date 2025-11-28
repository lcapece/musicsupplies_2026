@echo off
echo =============================================
echo AWS INFRASTRUCTURE DISCOVERY
echo =============================================
echo.

echo Finding EC2 instances with SQL Server...
echo -----------------------------------------
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,PrivateIpAddress,Tags[?Key=='Name'].Value|[0],State.Name]" --output table

echo.
echo Finding VPCs...
echo ---------------
aws ec2 describe-vpcs --query "Vpcs[*].[VpcId,CidrBlock,Tags[?Key=='Name'].Value|[0]]" --output table

echo.
echo Press any key to see subnets and security groups...
pause >nul

echo.
echo Finding Subnets (you need 2 private subnets)...
echo ------------------------------------------------
aws ec2 describe-subnets --query "Subnets[*].[SubnetId,VpcId,AvailabilityZone,CidrBlock,Tags[?Key=='Name'].Value|[0]]" --output table

echo.
echo Finding Security Groups...
echo --------------------------
aws ec2 describe-security-groups --query "SecurityGroups[*].[GroupId,GroupName,VpcId,Description]" --output table

echo.
echo =============================================
echo Copy the values you need into config.bat
echo =============================================
pause