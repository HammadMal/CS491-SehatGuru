import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Fonts } from '../../constants/fonts';
import { feedbackAPI } from '../../services/feedback.api';
import { FeedbackSection, FeedbackSubmissionPayload } from '../../types/feedback.types';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Okay',
  4: 'Good',
  5: 'Excellent',
};

const buildSections = (): FeedbackSection[] => [
  {
    sectionId: 'chatbot',
    title: 'Chatbot Feedback',
    description: 'Rate how well SehatGuru answers nutrition questions.',
    improvementComment: '',
    answers: [
      {
        questionId: 'chatbot_accuracy',
        question: 'How trustworthy did the nutrition advice provided by the chatbot feel to you?',
        rating: 0,
      },
      {
        questionId: 'chatbot_safety',
        question: 'How safe and appropriate were the chatbot recommendations?',
        rating: 0,
      },
      {
        questionId: 'chatbot_relevance',
        question: 'How relevant was the chatbot response to your question?',
        rating: 0,
      },
      {
        questionId: 'chatbot_completeness',
        question: 'How completely did the chatbot address all aspects of your query?',
        rating: 0,
      },
      {
        questionId: 'chatbot_clarity',
        question: 'How clear and understandable was the chatbot response?',
        rating: 0,
      },
    ],
  },
  {
    sectionId: 'camera',
    title: 'Camera Feedback',
    description: 'Rate the meal detection and camera capture experience.',
    improvementComment: '',
    answers: [
      {
        questionId: 'camera_detection_accuracy',
        question: 'How accurately did the camera feature identify your meal?',
        rating: 0,
      },
      {
        questionId: 'camera_speed',
        question: 'How satisfied were you with how quickly the camera feature returned a result?',
        rating: 0,
      },
      {
        questionId: 'camera_ease_of_use',
        question: 'How easy was it to capture and submit a meal photo?',
        rating: 0,
      },
      {
        questionId: 'camera_result_usefulness',
        question: 'How useful were the details shown after the camera detected your meal?',
        rating: 0,
      },
      {
        questionId: 'camera_trust',
        question: 'How confident are you that the detected meal matches what you actually ate?',
        rating: 0,
      },
    ],
  },
  {
    sectionId: 'meal_logging',
    title: 'Meal Logging Feedback',
    description: 'Rate how well the app helps you record meals.',
    improvementComment: '',
    answers: [
      {
        questionId: 'logging_speed',
        question: 'How easy was it to log a meal in the app?',
        rating: 0,
      },
      {
        questionId: 'logging_editing',
        question: 'How easy was it to review or manage your logged meals afterward?',
        rating: 0,
      },
      {
        questionId: 'logging_trust',
        question: 'How accurate do you believe the nutrition values of your logged meals are?',
        rating: 0,
      },
    ],
  },
  {
    sectionId: 'meal_planning',
    title: 'Meal Planning Feedback',
    description: 'Rate the quality and practicality of meal plan recommendations.',
    improvementComment: '',
    answers: [
      {
        questionId: 'planning_personalization',
        question: 'How personalized did the meal plan feel for your goals and preferences?',
        rating: 0,
      },
      {
        questionId: 'planning_practicality',
        question: 'How practical and feasible in your daily routine were the meal plan suggestions?',
        rating: 0,
      },
      {
        questionId: 'planning_helpfulness',
        question: 'How helpful was the meal planning feature overall?',
        rating: 0,
      },
    ],
  },
  {
    sectionId: 'usability',
    title: 'Overall Usability',
    description: 'Rate the overall experience of using the app.',
    improvementComment: '',
    answers: [
      {
        questionId: 'usability_navigation',
        question: 'How easy was it to navigate around the app?',
        rating: 0,
      },
      {
        questionId: 'usability_design',
        question: 'How clear and intuitive was the app interface?',
        rating: 0,
      },
      {
        questionId: 'usability_overall',
        question: 'Overall, how satisfied are you with SehatGuru?',
        rating: 0,
      },
      {
        questionId: 'usability_retention',
        question: 'How likely are you to continue using SehatGuru regularly?',
        rating: 0,
      },
    ],
  },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<FeedbackSection[]>(() => buildSections());
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalQuestions = useMemo(
    () => sections.reduce((count, section) => count + section.answers.length, 0),
    [sections]
  );
  const answeredQuestions = useMemo(
    () =>
      sections.reduce(
        (count, section) => count + section.answers.filter((answer) => answer.rating > 0).length,
        0
      ),
    [sections]
  );

  const handleRatingChange = (sectionId: string, questionId: string, rating: number) => {
    setSections((currentSections) =>
      currentSections.map((section) =>
        section.sectionId !== sectionId
          ? section
          : {
              ...section,
              answers: section.answers.map((answer) =>
                answer.questionId === questionId ? { ...answer, rating } : answer
              ),
            }
      )
    );
  };

  const handleImprovementCommentChange = (sectionId: string, improvementComment: string) => {
    setSections((currentSections) =>
      currentSections.map((section) =>
        section.sectionId === sectionId ? { ...section, improvementComment } : section
      )
    );
  };

  const handleSubmit = async () => {
    const unanswered = sections.flatMap((section) =>
      section.answers.filter((answer) => answer.rating === 0).map((answer) => answer.question)
    );

    if (unanswered.length > 0) {
      Alert.alert(
        'Complete all ratings',
        'Please rate every question before submitting your feedback.'
      );
      return;
    }

    const payload: FeedbackSubmissionPayload = {
      sections: sections.map((section) => ({
        section_id: section.sectionId,
        title: section.title,
        improvement_comment: section.improvementComment.trim(),
        answers: section.answers.map((answer) => ({
          question_id: answer.questionId,
          question: answer.question,
          rating: answer.rating,
        })),
      })),
      comment: comment.trim(),
    };

    try {
      setSubmitting(true);
      await feedbackAPI.submitFeedback(payload);
      Alert.alert('Thank you', 'Your feedback has been submitted successfully.');
      setSections(buildSections());
      setComment('');
    } catch (error: any) {
      Alert.alert(
        'Submission failed',
        error?.response?.data?.detail || 'We could not save your feedback. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Send Feedback</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Help Us Improve SehatGuru</Text>
          <Text style={styles.heroSubtitle}>
            Rate each feature from 1 to 5 based on your testing experience. Your responses are saved
            directly for the team to review.
          </Text>

          <View style={styles.progressRow}>
            <View style={styles.progressTextBlock}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>
                {answeredQuestions}/{totalQuestions} questions rated
              </Text>
            </View>
            <View style={styles.progressPill}>
              <Ionicons name="clipboard-outline" size={16} color="#166534" />
              <Text style={styles.progressPillText}>1 to 5 scale</Text>
            </View>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.sectionId} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionDescription}>{section.description}</Text>

            {section.answers.map((answer) => (
              <View key={answer.questionId} style={styles.questionBlock}>
                <Text style={styles.questionText}>{answer.question}</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = answer.rating === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.ratingChip, selected && styles.ratingChipSelected]}
                        onPress={() =>
                          handleRatingChange(section.sectionId, answer.questionId, value)
                        }
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.ratingChipNumber,
                            selected && styles.ratingChipNumberSelected,
                          ]}
                        >
                          {value}
                        </Text>
                        <Text
                          style={[
                            styles.ratingChipLabel,
                            selected && styles.ratingChipLabelSelected,
                          ]}
                        >
                          {RATING_LABELS[value]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={styles.improvementBlock}>
              <Text style={styles.improvementLabel}>
                How can we improve the {section.title.toLowerCase()}?
              </Text>
              <TextInput
                style={styles.improvementInput}
                multiline
                placeholder={`Share ideas to improve the ${section.title.toLowerCase()}.`}
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
                value={section.improvementComment}
                onChangeText={(text) => handleImprovementCommentChange(section.sectionId, text)}
                maxLength={1000}
              />
            </View>
          </View>
        ))}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Additional Comments</Text>
          <Text style={styles.sectionDescription}>
            Share anything else that would help us improve the app for testing and deployment.
          </Text>
          <TextInput
            style={styles.commentInput}
            multiline
            placeholder="What worked well? What felt confusing? What should we improve next?"
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
            maxLength={1500}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6FA' },
  navHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#F3F6FA',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', fontFamily: Fonts.bold, color: '#111' },
  scroll: { flex: 1, backgroundColor: '#F3F6FA' },
  container: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 32 },
  heroCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  heroTitle: { fontSize: 24, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#14532d', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 21, color: '#166534' },
  progressRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressTextBlock: { flex: 1 },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#16a34a',
  },
  progressValue: { marginTop: 4, fontSize: 16, fontWeight: '700', fontFamily: Fonts.bold, color: '#14532d' },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  progressPillText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.bold, color: '#166534' },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#111827' },
  sectionDescription: { fontSize: 13, fontFamily: Fonts.regular, color: '#64748b', marginTop: 4, lineHeight: 19 },
  questionBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  questionText: { fontSize: 15, lineHeight: 22, fontWeight: '600', fontFamily: Fonts.semibold, color: '#1f2937' },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  ratingChip: {
    minWidth: 58,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  ratingChipSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  ratingChipNumber: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#0f172a' },
  ratingChipNumberSelected: { color: '#fff' },
  ratingChipLabel: { marginTop: 2, fontSize: 10, fontWeight: '700', fontFamily: Fonts.bold, color: '#64748b' },
  ratingChipLabelSelected: { color: '#dcfce7' },
  commentInput: {
    marginTop: 14,
    minHeight: 130,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#0f172a',
  },
  improvementBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  improvementLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: '#1f2937',
  },
  improvementInput: {
    marginTop: 12,
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#0f172a',
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: '#16a34a',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#fff' },
  bottomSpacer: { height: 18 },
});
