export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface UserContext {
  name?: string;
  health_goals?: string[];
  dietary_restrictions?: string[];
  meal_preferences?: string[];
  daily_calorie_target?: number;
  age?: number;
  gender?: string;
  weight_kg?: number;
  height_cm?: number;
  activity_level?: string;
}

export interface ChatRequest {
  message: string;
  user_context?: UserContext;
  use_rag?: boolean;
}

export interface ChatResponse {
  response: string;
  rag_used?: boolean;
  intent?: string;
}
