import apiClient from './api';
import { FeedbackSubmissionPayload, FeedbackSubmissionResponse } from '../types/feedback.types';

export const feedbackAPI = {
  submitFeedback: async (
    payload: FeedbackSubmissionPayload
  ): Promise<FeedbackSubmissionResponse> => {
    const response = await apiClient.post('/api/feedback', payload);
    return response.data;
  },
};

