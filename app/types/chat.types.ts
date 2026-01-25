export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface UserContext {
  health_goals?: string[];
  dietary_restrictions?: string[];
  daily_calorie_target?: number;
  age?: number;
  gender?: string;
}

export interface ChatRequest {
  message: string;
  user_context?: UserContext;
  use_rag?: boolean;
}

export interface ChatResponse {
  response: string;
  rag_used?: boolean;
}
