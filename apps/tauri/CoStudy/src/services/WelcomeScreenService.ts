/**
 * Welcome Screen Service
 * 
 * Handles all welcome screen related data operations.
 * Follows Linus's philosophy: simple, direct, and transparent.
 * Uses UnifiedDataAccess for actual data operations.
 */

import { getUnifiedDataAccess } from './UnifiedDataAccess';
import { supabaseClient } from './db/supabaseClient';

// Welcome screen types
export interface WelcomeProgress {
  id?: string;
  user_id: string;
  current_step: number;
  total_steps: number;
  completed_steps: number[];
  is_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WelcomeContent {
  step: number;
  title: string;
  description: string;
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

// Default welcome progress
export const DEFAULT_WELCOME_PROGRESS: Omit<WelcomeProgress, 'user_id'> = {
  current_step: 1,
  total_steps: 3,
  completed_steps: [],
  is_completed: false
};

// Welcome content for each step
export const WELCOME_CONTENT: WelcomeContent[] = [
  {
    step: 1,
    title: "Learn Smarter, Not Harder",
    description: "Master any language with our advanced spaced repetition system.",
    features: [
      {
        icon: "BrainCircuit",
        title: "Optimized Learning",
        description: "Our smart algorithm predicts when you're about to forget and prompts you to review."
      },
      {
        icon: "Globe",
        title: "Speak the World",
        description: "Choose from dozens of languages and start your journey today."
      }
    ]
  },
  {
    step: 2,
    title: "Personalized Learning Experience",
    description: "Tailor your learning journey to your unique needs and preferences.",
    features: [
      {
        icon: "Settings",
        title: "Customizable Settings",
        description: "Adjust learning parameters to match your learning style."
      },
      {
        icon: "BarChart",
        title: "Progress Tracking",
        description: "Monitor your learning progress with detailed analytics."
      }
    ]
  },
  {
    step: 3,
    title: "Start Your Journey",
    description: "Ready to begin? Let's set up your profile and get started.",
    features: [
      {
        icon: "User",
        title: "Create Your Profile",
        description: "Tell us about yourself to personalize your experience."
      },
      {
        icon: "Target",
        title: "Set Your Goals",
        description: "Define your learning objectives and track your achievements."
      }
    ]
  }
];

class WelcomeScreenService {
  private dataAccess = getUnifiedDataAccess();
  private tableName = 'welcome_progress';

  /**
   * Get welcome progress for a user
   */
  async getWelcomeProgress(userId: string): Promise<WelcomeProgress | null> {
    try {
      const result = await this.dataAccess.select(this.tableName, {
        user_id: userId
      });

      return result.length > 0 ? result[0] as WelcomeProgress : null;
    } catch (error) {
      console.error('Error getting welcome progress:', error);
      return null;
    }
  }

  /**
   * Create welcome progress for a user
   */
  async createWelcomeProgress(userId: string): Promise<WelcomeProgress> {
    try {
      const progress: Omit<WelcomeProgress, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        ...DEFAULT_WELCOME_PROGRESS
      };

      const result = await this.dataAccess.insert(this.tableName, progress);
      return { ...progress, ...result } as WelcomeProgress;
    } catch (error) {
      console.error('Error creating welcome progress:', error);
      throw error;
    }
  }

  /**
   * Update welcome progress
   */
  async updateWelcomeProgress(userId: string, progress: Partial<WelcomeProgress>): Promise<WelcomeProgress> {
    try {
      const result = await this.dataAccess.update(this.tableName, progress, {
        user_id: userId
      });

      // Get the updated progress
      const updatedProgress = await this.getWelcomeProgress(userId);
      return updatedProgress as WelcomeProgress;
    } catch (error) {
      console.error('Error updating welcome progress:', error);
      throw error;
    }
  }

  /**
   * Get or create welcome progress for a user
   */
  async getOrCreateWelcomeProgress(userId: string): Promise<WelcomeProgress> {
    let progress = await this.getWelcomeProgress(userId);
    
    if (!progress) {
      progress = await this.createWelcomeProgress(userId);
    }
    
    return progress;
  }

  /**
   * Move to next step
   */
  async moveToNextStep(userId: string): Promise<WelcomeProgress> {
    const progress = await this.getOrCreateWelcomeProgress(userId);
    
    // Mark current step as completed
    const completedSteps = [...progress.completed_steps, progress.current_step];
    
    // Check if this is the last step
    const isCompleted = progress.current_step >= progress.total_steps;
    
    // Update progress
    return this.updateWelcomeProgress(userId, {
      current_step: isCompleted ? progress.current_step : progress.current_step + 1,
      completed_steps,
      is_completed
    });
  }

  /**
   * Jump to specific step
   */
  async jumpToStep(userId: string, step: number): Promise<WelcomeProgress> {
    const progress = await this.getOrCreateWelcomeProgress(userId);
    
    // Mark all previous steps as completed
    const completedSteps = [];
    for (let i = 1; i < step; i++) {
      completedSteps.push(i);
    }
    
    return this.updateWelcomeProgress(userId, {
      current_step: step,
      completed_steps
    });
  }

  /**
   * Reset welcome progress
   */
  async resetWelcomeProgress(userId: string): Promise<WelcomeProgress> {
    return this.updateWelcomeProgress(userId, {
      ...DEFAULT_WELCOME_PROGRESS
    });
  }

  /**
   * Get welcome content for a specific step
   */
  getWelcomeContent(step: number): WelcomeContent | null {
    return WELCOME_CONTENT.find(content => content.step === step) || null;
  }

  /**
   * Get all welcome content
   */
  getAllWelcomeContent(): WelcomeContent[] {
    return [...WELCOME_CONTENT];
  }

  /**
   * Check if welcome flow is completed
   */
  async isWelcomeCompleted(userId: string): Promise<boolean> {
    const progress = await this.getWelcomeProgress(userId);
    return progress?.is_completed || false;
  }

  /**
   * Mark welcome flow as completed
   */
  async markWelcomeCompleted(userId: string): Promise<WelcomeProgress> {
    const progress = await this.getOrCreateWelcomeProgress(userId);
    
    return this.updateWelcomeProgress(userId, {
      is_completed: true,
      current_step: progress.total_steps
    });
  }
}

// Singleton instance
let welcomeScreenServiceInstance: WelcomeScreenService | null = null;

export function getWelcomeScreenService(): WelcomeScreenService {
  if (!welcomeScreenServiceInstance) {
    welcomeScreenServiceInstance = new WelcomeScreenService();
  }
  return welcomeScreenServiceInstance;
}

export { WelcomeScreenService };