import { supabase } from '../lib/supabase';

// Configuration for AI services (API keys now handled by edge functions)
interface AIConfig {
  elevenLabsVoiceId: string;
  preferredLLM?: 'openai' | 'anthropic' | 'perplexity'; // User can choose
}

// Message types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode?: 'live' | 'ai';
}

type BotMode = 'chatbot' | 'human-like';

interface KnowledgeBaseResult {
  id: number;
  category: string;
  question: string;
  answer: string;
  relevance_score: number;
}

class AIChatService {
  private config: AIConfig;
  private conversationHistory: ChatMessage[] = [];
  private sessionId: string;
  private audioContext: AudioContext | null = null;
  private voiceEnabled: boolean = false;

  constructor(config: Partial<AIConfig>) {
    // API keys are now handled securely by edge functions - no client-side keys needed
    this.config = {
      elevenLabsVoiceId: config.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL', // Default to "Bella" voice
      preferredLLM: config.preferredLLM || 'openai'
    };
    this.sessionId = this.generateSessionId();
    // Load voice settings from database
    this.loadVoiceSettings();
  }

  // Load voice settings from database
  private async loadVoiceSettings() {
    try {
      // Prefer new centralized chat_voice_config table
      const { data: vc, error: vcError } = await supabase
        .from('chat_voice_config')
        .select('voice_id')
        .single();

      if (!vcError && vc && vc.voice_id) {
        this.config.elevenLabsVoiceId = vc.voice_id;
        return;
      }

      // Fallback to legacy chat_config keys if present
      const { data, error } = await supabase
        .from('chat_config')
        .select('config_value')
        .eq('config_key', 'elevenlabs_voice_id')
        .single();

      if (!error && data) {
        this.config.elevenLabsVoiceId = data.config_value;
      }
    } catch (error) {
    }
  }

  private generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // Check if live staff is available (9 AM - 5 PM Eastern Time)
  async isStaffAvailable(): Promise<boolean> {
    try {
      // Get current time in Eastern Time
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const hours = easternTime.getHours();
      const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Business hours: Monday-Friday (1-5), 9 AM - 5 PM (9-17)
      const isBusinessHours = day >= 1 && day <= 5 && hours >= 9 && hours < 17;
      
      // Optional: Still check database for manual override (staff marked as available/unavailable)
      try {
        const { data, error } = await supabase
          .rpc('is_chat_staff_available');
        
        if (!error && data !== null) {
          // If database has override, use it
          return data;
        }
      } catch (dbError) {
        // If database check fails, fall back to business hours
        console.log('Database check failed, using business hours:', dbError);
      }
      
      return isBusinessHours;
    } catch (error) {
      console.error('Error checking staff availability:', error);
      return false;
    }
  }

  // Search knowledge base using Supabase
  async searchKnowledgeBase(query: string): Promise<KnowledgeBaseResult[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_knowledge_base', {
          query_text: query,
          limit_results: 3
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  // Generate AI response using Anthropic Claude via edge function
  async generateClaudeResponse(userMessage: string, systemPrompt: string): Promise<string> {
    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...this.conversationHistory.slice(-5).map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
          content: msg.content
        })),
        { role: 'user' as const, content: userMessage }
      ];

      const { data, error } = await supabase.functions.invoke('ai-chat-proxy', {
        body: {
          provider: 'anthropic',
          messages,
          systemPrompt,
          maxTokens: 300,
          temperature: 0.7
        }
      });

      if (error) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from Anthropic');
      }

      return data.content;
    } catch (error) {
      console.error('Error with Claude:', error);
      throw error;
    }
  }

  // Generate AI response using OpenAI via edge function
  async generateOpenAIResponse(userMessage: string, systemPrompt: string, model: string = 'gpt-4o'): Promise<string> {
    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...this.conversationHistory.slice(-5).map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        { role: 'user' as const, content: userMessage }
      ];

      const { data, error } = await supabase.functions.invoke('ai-chat-proxy', {
        body: {
          provider: 'openai',
          messages,
          model,
          maxTokens: 200,
          temperature: 0.7
        }
      });

      if (error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from OpenAI');
      }

      return data.content;
    } catch (error) {
      console.error('Error with OpenAI:', error);
      throw error;
    }
  }

  // Generate AI response using Perplexity via edge function
  async generatePerplexityResponse(userMessage: string, systemPrompt: string): Promise<string> {
    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...this.conversationHistory.slice(-5).map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        { role: 'user' as const, content: userMessage }
      ];

      const { data, error } = await supabase.functions.invoke('ai-chat-proxy', {
        body: {
          provider: 'perplexity',
          messages,
          maxTokens: 300,
          temperature: 0.7
        }
      });

      if (error) {
        throw new Error(`Perplexity API error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from Perplexity');
      }

      return data.content;
    } catch (error) {
      console.error('Error with Perplexity:', error);
      throw error;
    }
  }

  // Generate AI response using the selected LLM provider
  async generateAIResponse(userMessage: string, botMode: BotMode = 'chatbot'): Promise<string> {
    try {
      // First, search the knowledge base
      const knowledgeResults = await this.searchKnowledgeBase(userMessage);
      
      // If we have high-confidence matches, use them
      if (knowledgeResults.length > 0 && knowledgeResults[0].relevance_score > 0.7) {
        return knowledgeResults[0].answer;
      }

      // Create system prompt based on bot mode
      let systemPrompt: string;
      
      if (botMode === 'human-like') {
        systemPrompt = `You are Alex, a passionate music enthusiast working at Music Supplies. You have a warm, conversational personality and love helping customers find their perfect instrument.
        
        Personality traits:
        - Enthusiastic about music and instruments
        - Use casual, friendly language (but still professional)
        - Share personal experiences and recommendations when relevant
        - Use emojis occasionally to add warmth (but not excessively)
        - Show genuine interest in the customer's musical journey
        - React naturally with phrases like "Oh, that's awesome!" or "I totally get that!"
        
        Our store information:
        - We carry guitars (Yamaha, Ibanez, Epiphone), drums (Pearl, Tama, Ludwig), and keyboards (Roland, Korg, Yamaha)
        - We offer repairs, lessons ($30/30min, $50/hour), and financing
        - Hours: Mon-Fri 9am-6pm, Sat 10am-4pm, Sun closed
        - Free shipping over $99
        
        ${knowledgeResults.length > 0 ? `Related information from our database:\n${knowledgeResults.map(r => r.answer).join('\n')}` : ''}
        
        If you don't know something specific, say something like "Let me grab someone who knows more about that!" or "I'd love to get you the exact info - let me connect you with our specialist."
        Keep responses conversational and engaging.`;
      } else {
        systemPrompt = `You are a friendly and helpful virtual receptionist for Music Supplies, a music instrument store. 
        You should be warm, professional, and knowledgeable about musical instruments and our services.
        
        Our store information:
        - We carry guitars (Yamaha, Ibanez, Epiphone), drums (Pearl, Tama, Ludwig), and keyboards (Roland, Korg, Yamaha)
        - We offer repairs, lessons ($30/30min, $50/hour), and financing
        - Hours: Mon-Fri 9am-6pm, Sat 10am-4pm, Sun closed
        - Free shipping over $99
        
        ${knowledgeResults.length > 0 ? `Related information from our database:\n${knowledgeResults.map(r => r.answer).join('\n')}` : ''}
        
        If you don't know something specific, offer to connect them with a staff member or take their contact info.
        Keep responses concise and friendly.`;
      }

      // Determine which LLM to use based on query type
      let llmProvider = this.config.preferredLLM || 'openai';
      
      // Use Perplexity for real-time info queries
      if (userMessage.toLowerCase().includes('price') || 
          userMessage.toLowerCase().includes('stock') ||
          userMessage.toLowerCase().includes('availability')) {
        llmProvider = 'perplexity';
      }
      
      // Use Claude for complex reasoning
      if (userMessage.toLowerCase().includes('compare') || 
          userMessage.toLowerCase().includes('recommend') ||
          userMessage.toLowerCase().includes('which is better')) {
        llmProvider = 'anthropic';
      }

      // Try the selected LLM, fallback to others if needed
      let response: string;
      
      try {
        switch (llmProvider) {
          case 'anthropic':
            response = await this.generateClaudeResponse(userMessage, systemPrompt);
            break;
          case 'perplexity':
            response = await this.generatePerplexityResponse(userMessage, systemPrompt);
            break;
          default:
            // Use OpenAI as default via edge function
            response = await this.generateOpenAIResponse(userMessage, systemPrompt);
        }
      } catch (primaryError) {
        console.error(`Error with ${llmProvider}:`, primaryError);

        // Fallback to OpenAI if primary fails
        try {
          response = await this.generateOpenAIResponse(userMessage, systemPrompt, 'gpt-3.5-turbo');
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Fallback to knowledge base or default response
      const knowledgeResults = await this.searchKnowledgeBase(userMessage);
      if (knowledgeResults.length > 0) {
        return knowledgeResults[0].answer;
      }
      
      return "I apologize, but I'm having trouble understanding your question. Would you like me to connect you with one of our staff members who can help you better?";
    }
  }

  // Generate embeddings for knowledge base (for advanced search) via edge function
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-proxy', {
        body: {
          provider: 'embedding',
          text
        }
      });

      if (error) {
        throw new Error(`Embedding API error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error generating embedding');
      }

      return data.embedding || [];
    } catch (error) {
      console.error('Error generating embedding:', error);
      return [];
    }
  }

  // Convert text to speech using ElevenLabs via edge function
  async textToSpeech(text: string): Promise<ArrayBuffer | null> {
    if (!this.voiceEnabled) {
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-proxy', {
        body: {
          provider: 'elevenlabs',
          text,
          voiceId: this.config.elevenLabsVoiceId
        }
      });

      if (error) {
        throw new Error(`ElevenLabs API error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from ElevenLabs');
      }

      // Convert base64 audio back to ArrayBuffer
      if (data.audioBase64) {
        const binaryString = atob(data.audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }

      return null;
    } catch (error) {
      console.error('Error generating speech:', error);
      return null;
    }
  }

  // Play audio response
  async playAudioResponse(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      const audioData = await this.audioContext.decodeAudioData(audioBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioData;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }


  // Main chat method
  async sendMessage(
    message: string, 
    userIdentifier?: string,
    preferVoice: boolean = false,
    botMode: BotMode = 'chatbot'
  ): Promise<{ text: string; audio?: ArrayBuffer; mode: 'live' | 'ai' }> {
    // Store user message
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Log conversation to database
    await this.logConversation('user', message, userIdentifier);

    // Check if staff is available
    const staffAvailable = await this.isStaffAvailable();

    if (staffAvailable) {
      // Route to live chat (existing WebSocket implementation)
      return {
        text: "Connecting you to our live receptionist...",
        mode: 'live'
      };
    }

    // Generate AI response with bot mode
    const aiResponse = await this.generateAIResponse(message, botMode);
    
    // Store AI response
    this.conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      mode: 'ai'
    });

    // Log AI response
    await this.logConversation('assistant', aiResponse, userIdentifier, 'ai');

    // Generate voice if requested
    let audioBuffer: ArrayBuffer | null = null;
    if (preferVoice) {
      audioBuffer = await this.textToSpeech(aiResponse);
    }

    return {
      text: aiResponse,
      audio: audioBuffer || undefined,
      mode: 'ai'
    };
  }

  // Log conversation to database
  private async logConversation(
    messageType: 'user' | 'assistant' | 'system',
    message: string,
    userIdentifier?: string,
    mode: 'live' | 'ai' = 'ai'
  ): Promise<void> {
    try {
      await supabase
        .from('chat_conversations')
        .insert({
          session_id: this.sessionId,
          user_identifier: userIdentifier,
          message_type: messageType,
          message: message,
          mode: mode,
          metadata: {
            timestamp: new Date().toISOString(),
            conversationLength: this.conversationHistory.length
          }
        });
    } catch (error) {
      console.error('Error logging conversation:', error);
    }
  }

  // Enable/disable voice
  setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
    if (enabled && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Get conversation history
  getConversationHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  // Clear conversation
  clearConversation(): void {
    this.conversationHistory = [];
    this.sessionId = this.generateSessionId();
  }

  // Add knowledge to database (admin function)
  async addKnowledgeBaseEntry(
    category: string,
    question: string,
    answer: string,
    keywords: string[]
  ): Promise<boolean> {
    try {
      // Generate embedding for the question
      const embedding = await this.generateEmbedding(question + ' ' + answer);

      const { error } = await supabase
        .from('chat_knowledge_base')
        .insert({
          category,
          question,
          answer,
          keywords,
          embedding: embedding.length > 0 ? embedding : null
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding knowledge base entry:', error);
      return false;
    }
  }
}

export default AIChatService;

// Export singleton instance
export const aiChatService = new AIChatService({});
