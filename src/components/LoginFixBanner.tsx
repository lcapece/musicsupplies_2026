import React, { useState } from 'react';
import { applyFixedAuthFunctionMigration, applyAccount99Migration, applyBrandMapColumnsMigration } from '../utils/applyMigration';

// Banner component to allow administrators to apply the authentication function fix
const LoginFixBanner: React.FC = () => {
  const [isApplying, setIsApplying] = useState(false);
  const [isApplyingAccount99, setIsApplyingAccount99] = useState(false);
  const [isApplyingBrandMap, setIsApplyingBrandMap] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    debug?: string;
  }>({});
  const [showDebug, setShowDebug] = useState(false);

  const handleApplyFix = async () => {
    setIsApplying(true);
    setResult({});
    
    try {
      const migrationResult = await applyFixedAuthFunctionMigration();
      setResult(migrationResult);
    } catch (error) {
      console.error('Failed to apply authentication fix:', error);
      setResult({
        success: false,
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyAccount99 = async () => {
    setIsApplyingAccount99(true);
    setResult({});
    
    try {
      const migrationResult = await applyAccount99Migration();
      setResult(migrationResult);
    } catch (error) {
      console.error('Failed to apply Account 99 migration:', error);
      setResult({
        success: false,
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsApplyingAccount99(false);
    }
  };

  const handleApplyBrandMap = async () => {
    setIsApplyingBrandMap(true);
    setResult({});
    
    try {
      const migrationResult = await applyBrandMapColumnsMigration();
      setResult(migrationResult);
    } catch (error) {
      console.error('Failed to apply Brand/MAP columns migration:', error);
      setResult({
        success: false,
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsApplyingBrandMap(false);
    }
  };

  // Hide the banner for account 999 backend - maintenance buttons removed
  return null;
};

export default LoginFixBanner;
