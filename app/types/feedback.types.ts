export type FeedbackAnswer = {
  questionId: string;
  question: string;
  rating: number;
};

export type FeedbackSection = {
  sectionId: string;
  title: string;
  description: string;
  improvementComment: string;
  answers: FeedbackAnswer[];
};

export type FeedbackSubmissionPayload = {
  sections: {
    section_id: string;
    title: string;
    improvement_comment?: string;
    answers: {
      question_id: string;
      question: string;
      rating: number;
    }[];
  }[];
  comment?: string;
};

export type FeedbackSubmissionResponse = {
  id: string;
  message: string;
  submitted_at: string;
};
