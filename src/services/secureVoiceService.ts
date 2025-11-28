import { supabase } from '../lib/supabase';

interface VoiceConfig {
  voiceId: string;
  voiceName: string;
  rateLimit: number;
  dailyLimit: number;
  enabled: boolean;
}

interface RateLimitCheck {
  allowed: boolean;
  minutesUsed: number;
  minutesRemaining: number;
  resetTime?: Date;
  message?: string;
}

class SecureVoiceService {
  private voiceConfig: VoiceConfig | null = null;
  private ipAddress: string | null = null;
  private dailyUsage: number = 0;
  private lastDailyReset: Date = new Date();

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    // Load voice configuration
    await this.loadVoiceConfig();
    
    // Get client IP (in production, this would come from the server)
    this.ipAddress = await this.getClientIP();
    
    // Initialize daily usage tracking
    await this.checkDailyUsage();
  }

  private async loadVoiceConfig(): Promise<void> {
    try {
      const { data } = await supabase
        .from('chat_voice_config')
        .select('*')
        .single();

      if (data) {
        this.voiceConfig = {
          voiceId: data.voice_id,
          voiceName: data.voice_name,
          rateLimit: data.rate_limit || 5,
          dailyLimit: data.daily_limit || 100,
          enabled: data.enabled
        };
      } else {
        // Default configuration
        this.voiceConfig = {
          voiceId: 'EXAVITQu4vr4xnSDxMaL',
          voiceName: 'Bella',
          rateLimit: 5,
          dailyLimit: 100,
          enabled: true
        };
      }
    } catch (error) {
      console.error('Error loading voice config:', error);
      // Use defaults on error
      this.voiceConfig = {
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        voiceName: 'Bella',
        rateLimit: 5,
        dailyLimit: 100,
        enabled: false // Disable on error for safety
      };
    }
  }

  private async getClientIP(): Promise<string> {
    // In production, this should come from your backend
    // For now, we'll use a placeholder or get it from a service
    try {
      // Option 1: Get from your backend
      const response = await fetch('/api/client-ip');
      if (response.ok) {
        const data = await response.json();
        return data.ip;
      }
    } catch (error) {
      console.error('Error getting client IP:', error);
    }
    
    // Fallback to a unique identifier for development
    return `dev-${Date.now()}`;
  }

  private async checkDailyUsage(): Promise<void> {
    try {
      const { data } = await supabase
        .from('chat_ip_limits')
        .select('minutes_used, last_reset')
        .gte('last_reset', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      if (data) {
        this.dailyUsage = data.reduce((sum, record) => sum + record.minutes_used, 0);
      }
    } catch (error) {
      console.error('Error checking daily usage:', error);
    }
  }

  public async checkRateLimit(): Promise<RateLimitCheck> {
    if (!this.voiceConfig?.enabled) {
      return {
        allowed: false,
        minutesUsed: 0,
        minutesRemaining: 0,
        message: 'Voice chat is currently disabled'
      };
    }

    if (!this.ipAddress) {
      return {
        allowed: false,
        minutesUsed: 0,
        minutesRemaining: 0,
        message: 'Unable to verify IP address'
      };
    }

    try {
      // Check if IP is blocked
      const { data: blockData } = await supabase
        .from('chat_ip_limits')
        .select('blocked')
        .eq('ip_address', this.ipAddress)
        .single();

      if (blockData?.blocked) {
        return {
          allowed: false,
          minutesUsed: 0,
          minutesRemaining: 0,
          message: 'Your IP has been temporarily blocked. Please contact support.'
        };
      }

      // Check daily global limit
      await this.checkDailyUsage();
      if (this.dailyUsage >= this.voiceConfig.dailyLimit) {
        return {
          allowed: false,
          minutesUsed: this.dailyUsage,
          minutesRemaining: 0,
          message: 'Daily voice limit reached. Please try again tomorrow.'
        };
      }

      // Check IP-specific rate limit
      const { data: limitData } = await supabase
        .from('chat_ip_limits')
        .select('*')
        .eq('ip_address', this.ipAddress)
        .single();

      if (limitData) {
        const minutesUsed = limitData.minutes_used || 0;
        const lastReset = new Date(limitData.last_reset);
        const hoursSinceReset = (Date.now() - lastReset.getTime()) / (1000 * 60 * 60);

        // Reset if more than 24 hours
        if (hoursSinceReset >= 24) {
          await this.resetIPLimit();
          return {
            allowed: true,
            minutesUsed: 0,
            minutesRemaining: this.voiceConfig.rateLimit
          };
        }

        if (minutesUsed >= this.voiceConfig.rateLimit) {
          const resetTime = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000);
          return {
            allowed: false,
            minutesUsed,
            minutesRemaining: 0,
            resetTime,
            message: `Voice limit reached. Resets at ${resetTime.toLocaleTimeString()}`
          };
        }

        return {
          allowed: true,
          minutesUsed,
          minutesRemaining: this.voiceConfig.rateLimit - minutesUsed
        };
      } else {
        // First time user
        await this.createIPLimit();
        return {
          allowed: true,
          minutesUsed: 0,
          minutesRemaining: this.voiceConfig.rateLimit
        };
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return {
        allowed: false,
        minutesUsed: 0,
        minutesRemaining: 0,
        message: 'Unable to verify rate limits'
      };
    }
  }

  private async createIPLimit(): Promise<void> {
    if (!this.ipAddress) return;

    try {
      await supabase
        .from('chat_ip_limits')
        .insert({
          ip_address: this.ipAddress,
          minutes_used: 0,
          last_reset: new Date().toISOString(),
          blocked: false
        });
    } catch (error) {
      console.error('Error creating IP limit record:', error);
    }
  }

  private async resetIPLimit(): Promise<void> {
    if (!this.ipAddress) return;

    try {
      await supabase
        .from('chat_ip_limits')
        .update({
          minutes_used: 0,
          last_reset: new Date().toISOString()
        })
        .eq('ip_address', this.ipAddress);
    } catch (error) {
      console.error('Error resetting IP limit:', error);
    }
  }

  public async trackVoiceUsage(durationSeconds: number): Promise<void> {
    if (!this.ipAddress) return;

    const minutes = durationSeconds / 60;

    try {
      // Update IP-specific usage
      const { data: currentData } = await supabase
        .from('chat_ip_limits')
        .select('minutes_used')
        .eq('ip_address', this.ipAddress)
        .single();

      if (currentData) {
        await supabase
          .from('chat_ip_limits')
          .update({
            minutes_used: (currentData.minutes_used || 0) + minutes
          })
          .eq('ip_address', this.ipAddress);
      }

      // Update daily total
      this.dailyUsage += minutes;

      // Log usage for analytics
      await supabase
        .from('voice_usage_log')
        .insert({
          ip_address: this.ipAddress,
          duration_seconds: durationSeconds,
          voice_id: this.voiceConfig?.voiceId,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking voice usage:', error);
    }
  }

  public async generateVoiceResponse(text: string): Promise<ArrayBuffer | null> {
    // Check rate limits first
    const rateCheck = await this.checkRateLimit();
    if (!rateCheck.allowed) {
      console.warn('Voice rate limit exceeded:', rateCheck.message);
      return null;
    }

    if (!this.voiceConfig?.enabled) {
      console.warn('Voice is disabled');
      return null;
    }

    try {
      // Make request through your backend to protect API key
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: this.voiceConfig.voiceId,
          ipAddress: this.ipAddress
        })
      });

      if (!response.ok) {
        throw new Error('Voice synthesis failed');
      }

      const audioData = await response.arrayBuffer();
      
      // Track usage (estimate based on text length)
      const estimatedSeconds = text.length * 0.06; // Rough estimate
      await this.trackVoiceUsage(estimatedSeconds);

      return audioData;
    } catch (error) {
      console.error('Error generating voice:', error);
      return null;
    }
  }

  public getVoiceConfig(): VoiceConfig | null {
    return this.voiceConfig;
  }

  public async refreshConfig(): Promise<void> {
    await this.loadVoiceConfig();
  }

  public getRemainingMinutes(): number {
    if (!this.voiceConfig) return 0;
    return Math.max(0, this.voiceConfig.rateLimit - (this.dailyUsage || 0));
  }

  public isVoiceEnabled(): boolean {
    return this.voiceConfig?.enabled || false;
  }
}

// Export singleton instance
export const secureVoiceService = new SecureVoiceService();