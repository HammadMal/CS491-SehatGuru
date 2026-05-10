import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore
import os
from pathlib import Path
from textblob import TextBlob
import io
import base64
import re

# Constants for branding
APP_GREEN = "#22c55e"
GREEN_PALETTE = ["#22c55e", "#86efac", "#16a34a", "#059669", "#10b981"]
LOGO_PATH = Path(__file__).parent.parent / "app" / "assets" / "images" / "logobgrm.png"
STOP_WORDS = {
    "a", "about", "add", "after", "all", "also", "an", "and", "are", "as", "at",
    "be", "but", "by", "can", "did", "do", "for", "from", "had", "has", "have",
    "how", "i", "if", "in", "is", "it", "make", "me", "more", "my", "of", "on",
    "or", "our", "some", "than", "that", "the", "their", "this", "to", "use",
    "user", "users", "was", "were", "when", "with", "would", "you", "your",
}

# Page config
st.set_page_config(
    page_title="SehatGuru Analytics",
    page_icon=str(LOGO_PATH) if LOGO_PATH.exists() else "🏥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Firebase (only once)
if not firebase_admin._apps:
    # Path to firebase credentials (assuming it's in the parent backend folder)
    creds_path = Path(__file__).parent.parent / "backend" / "firebase-credentials.json"
    if creds_path.exists():
        try:
            cred = credentials.Certificate(str(creds_path))
            firebase_admin.initialize_app(cred)
        except Exception as e:
            st.error(f"Failed to initialize Firebase: {str(e)}")
            st.stop()
    else:
        st.error("Firebase credentials not found. Please ensure firebase-credentials.json is in backend/ folder.")
        st.stop()

try:
    db = firestore.client()
except Exception as e:
    st.error(f"Failed to connect to Firestore: {str(e)}")
    st.stop()

# Cache data loading
@st.cache_data(ttl=300)  # Cache for 5 minutes
def load_users_data():
    """Load users collection data"""
    users_ref = db.collection('users')
    docs = users_ref.stream()
    
    data = []
    for doc in docs:
        user_data = doc.to_dict()
        user_data['uid'] = doc.id
        data.append(user_data)
    
    return pd.DataFrame(data) if data else pd.DataFrame()

@st.cache_data(ttl=300)
def load_meals_data():
    """Load meals collection data"""
    meals_ref = db.collection('meals')
    docs = meals_ref.stream()
    
    data = []
    for doc in docs:
        meal_data = doc.to_dict()
        meal_data['id'] = doc.id
        data.append(meal_data)
    
    return pd.DataFrame(data) if data else pd.DataFrame()

@st.cache_data(ttl=300)
def load_feedback_data():
    """Load feedback_submissions collection data"""
    feedback_ref = db.collection('feedback_submissions')
    docs = feedback_ref.stream()
    
    data = []
    for doc in docs:
        feedback_data = doc.to_dict()
        feedback_data['id'] = doc.id
        data.append(feedback_data)
    
    return pd.DataFrame(data) if data else pd.DataFrame()

# Load data
if st.sidebar.button("🔄 Refresh Data", help="Clear cache and reload data from Firestore"):
    st.cache_data.clear()
    st.rerun()

with st.spinner("Loading data from Firestore..."):
    try:
        users_df = load_users_data()
        meals_df = load_meals_data()
        feedback_df = load_feedback_data()
    except Exception as e:
        st.error(f"Failed to load data from Firestore: {str(e)}")
        st.stop()

# Sidebar
if LOGO_PATH.exists():
    st.sidebar.image(str(LOGO_PATH), width=200)
else:
    st.sidebar.title("SehatGuru Analytics")
st.sidebar.markdown("---")

# Date filter
st.sidebar.subheader("Date Range Filter")
use_date_filter = st.sidebar.checkbox("Enable Date Filter", value=False)
if use_date_filter:
    date_range = st.sidebar.date_input(
        "Select Date Range",
        value=(datetime.now().date() - timedelta(days=30), datetime.now().date()),
        key="date_range"
    )
else:
    # Default to a wide range when filter is disabled
    date_range = (datetime(2000, 1, 1).date(), datetime.now().date())

# User segment filters
st.sidebar.subheader("User Segment Filters")
show_completed_onboarding = st.sidebar.checkbox("Completed Onboarding Only", value=False)
selected_health_goals = st.sidebar.multiselect(
    "Filter by Health Goals",
    options=["lose-weight", "maintain-weight", "gain-weight", "build-muscle", "improve-health", "manage-condition"],
    default=[]
)
selected_activity_levels = st.sidebar.multiselect(
    "Filter by Activity Level",
    options=["sedentary", "lightly-active", "moderately-active", "very-active", "extra-active"],
    default=[]
)

# Apply filters function
def apply_user_filters(df):
    filtered_df = df.copy()
    
    # Date filter (if we have creation dates)
    if 'created_at' in filtered_df.columns:
        start_date, end_date = date_range
        filtered_df['created_at'] = pd.to_datetime(filtered_df['created_at'], errors='coerce')
        filtered_df = filtered_df[
            (filtered_df['created_at'].dt.date >= start_date) & 
            (filtered_df['created_at'].dt.date <= end_date)
        ]
    
    # Onboarding filter
    if show_completed_onboarding and 'onboarding_completed' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['onboarding_completed'] == True]
    
    # Health goals filter
    if selected_health_goals and 'health_goals' in filtered_df.columns:
        filtered_df = filtered_df[
            filtered_df['health_goals'].apply(
                lambda x: isinstance(x, list) and any(goal in x for goal in selected_health_goals)
            ) if pd.notna(filtered_df['health_goals']).any() else True
        ]
    
    # Activity level filter
    if selected_activity_levels and 'activity_level' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['activity_level'].isin(selected_activity_levels)]
    
    return filtered_df

# Apply filters to data
filtered_users_df = apply_user_filters(users_df)

# Debug information (can be removed later)
if st.sidebar.checkbox("Show Debug Info", value=False):
    st.sidebar.markdown("---")
    st.sidebar.subheader("Debug Info")
    st.sidebar.write(f"Raw users in DB: {len(users_df)}")
    st.sidebar.write(f"Filtered users: {len(filtered_users_df)}")
    st.sidebar.write(f"Meals in DB: {len(meals_df)}")
    st.sidebar.write(f"Feedback in DB: {len(feedback_df)}")
    if 'created_at' in users_df.columns:
        st.sidebar.write(f"Users with dates: {users_df['created_at'].notna().sum()}")
    if 'onboarding_completed' in users_df.columns:
        completed = users_df['onboarding_completed'].sum() if not users_df.empty else 0
        st.sidebar.write(f"Raw completed onboarding: {completed}")

# CSV export functions
def create_csv_download_link(df, filename):
    export_df = df.drop(columns=["synthetic", "seed_batch"], errors="ignore")
    csv = export_df.to_csv(index=False)
    b64 = base64.b64encode(csv.encode()).decode()
    href = f'<a href="data:file/csv;base64,{b64}" download="{filename}">Download {filename}</a>'
    return href


def shorten_question(question_id, question):
    labels = {
        "chatbot_accuracy": "Chatbot trust",
        "chatbot_safety": "Chatbot safety",
        "chatbot_relevance": "Chatbot relevance",
        "chatbot_completeness": "Chatbot completeness",
        "chatbot_clarity": "Chatbot clarity",
        "camera_detection_accuracy": "Camera detection",
        "camera_speed": "Camera speed",
        "camera_ease_of_use": "Camera ease",
        "camera_result_usefulness": "Camera result value",
        "camera_trust": "Camera confidence",
        "logging_speed": "Logging speed",
        "logging_editing": "Meal review/editing",
        "logging_trust": "Nutrition accuracy",
        "planning_personalization": "Plan personalization",
        "planning_practicality": "Plan practicality",
        "planning_helpfulness": "Plan helpfulness",
        "usability_navigation": "Navigation",
        "usability_design": "Interface clarity",
        "usability_overall": "Overall satisfaction",
        "usability_retention": "Retention intent",
    }
    if question_id in labels:
        return labels[question_id]

    cleaned = str(question).replace("How ", "").replace("how ", "").strip(" ?")
    return cleaned[:42] + ("..." if len(cleaned) > 42 else "")


def sentiment_label(score):
    if score <= -0.1:
        return "Negative"
    if score >= 0.1:
        return "Positive"
    return "Neutral"


def tokenize_feedback_text(values):
    words = []
    for value in values:
        if not isinstance(value, str):
            continue
        for word in re.findall(r"[a-zA-Z][a-zA-Z'-]{2,}", value.lower()):
            if word not in STOP_WORDS:
                words.append(word)
    return words


def flatten_feedback(feedback_source_df):
    rating_rows = []
    comment_rows = []

    for _, row in feedback_source_df.iterrows():
        submitted_at = pd.to_datetime(row.get("submitted_at"), errors="coerce")
        user_email = row.get("userEmail", "")
        user_id = row.get("userId", "")
        general_comment = row.get("comment", "")

        if isinstance(general_comment, str) and general_comment.strip():
            try:
                polarity = TextBlob(general_comment).sentiment.polarity
            except Exception:
                polarity = 0
            comment_rows.append({
                "submitted_at": submitted_at,
                "userEmail": user_email,
                "userId": user_id,
                "source": "General",
                "section_title": "General",
                "comment": general_comment,
                "sentiment": polarity,
                "sentiment_label": sentiment_label(polarity),
            })

        sections = row.get("sections")
        if not isinstance(sections, list):
            continue

        for section in sections:
            if not isinstance(section, dict):
                continue

            section_id = section.get("section_id", "")
            section_title = section.get("title", section_id or "Unknown")
            improvement = section.get("improvement_comment", "")
            if isinstance(improvement, str) and improvement.strip():
                try:
                    polarity = TextBlob(improvement).sentiment.polarity
                except Exception:
                    polarity = 0
                comment_rows.append({
                    "submitted_at": submitted_at,
                    "userEmail": user_email,
                    "userId": user_id,
                    "source": "Improvement",
                    "section_title": section_title,
                    "comment": improvement,
                    "sentiment": polarity,
                    "sentiment_label": sentiment_label(polarity),
                })

            answers = section.get("answers")
            if not isinstance(answers, list):
                continue

            for answer in answers:
                if not isinstance(answer, dict):
                    continue

                rating = pd.to_numeric(answer.get("rating"), errors="coerce")
                if pd.isna(rating):
                    continue

                question_id = answer.get("question_id", "")
                question = answer.get("question", "")
                rating_rows.append({
                    "submitted_at": submitted_at,
                    "userEmail": user_email,
                    "userId": user_id,
                    "section_id": section_id,
                    "section_title": section_title,
                    "question_id": question_id,
                    "question": question,
                    "question_label": shorten_question(question_id, question),
                    "rating": float(rating),
                    "low_score": float(rating) <= 3,
                    "promoter_score": float(rating) >= 4,
                })

    return pd.DataFrame(rating_rows), pd.DataFrame(comment_rows)

# Main content
st.title("SehatGuru Analytics Dashboard")
st.markdown("Comprehensive analytics for user behavior, meal logging, and feedback.")

# Overview metrics
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("Total Users", len(filtered_users_df))

with col2:
    completed_onboarding = 0
    if 'onboarding_completed' in filtered_users_df.columns:
        # Handle different data types for onboarding_completed
        completed_onboarding = sum(1 for val in filtered_users_df['onboarding_completed'] 
                                 if val is True or str(val).lower() in ['true', '1', 'yes'])
    st.metric("Completed Onboarding", completed_onboarding)

with col3:
    st.metric("Total Meals Logged", len(meals_df))

with col4:
    st.metric("Feedback Submissions", len(feedback_df))

# Export buttons
st.subheader("Export Data")
col1, col2, col3 = st.columns(3)
with col1:
    if not filtered_users_df.empty:
        st.markdown(create_csv_download_link(filtered_users_df, "users_data.csv"), unsafe_allow_html=True)
with col2:
    if not meals_df.empty:
        st.markdown(create_csv_download_link(meals_df, "meals_data.csv"), unsafe_allow_html=True)
with col3:
    if not feedback_df.empty:
        st.markdown(create_csv_download_link(feedback_df, "feedback_data.csv"), unsafe_allow_html=True)

st.markdown("---")

# Tabs for different analytics sections
tab1, tab2, tab3 = st.tabs(["User Profiles", "Meal Analytics", "Feedback Analytics"])

# Tab 1: User Profiles
with tab1:
    st.header("User Profile Analytics")
    
    if not filtered_users_df.empty:
        # Demographics
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Age Distribution")
            if 'basic_info' in filtered_users_df.columns:
                ages = []
                for _, row in filtered_users_df.iterrows():
                    basic_info = row['basic_info']
                    if isinstance(basic_info, dict) and 'age' in basic_info:
                        try:
                            ages.append(int(basic_info['age']))
                        except (ValueError, TypeError):
                            pass
                
                if ages:
                    fig = px.histogram(ages, nbins=20, title="User Age Distribution", 
                                     color_discrete_sequence=[APP_GREEN])
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No age data available")
        
        with col2:
            st.subheader("Gender Distribution")
            if 'basic_info' in filtered_users_df.columns:
                genders = []
                for _, row in filtered_users_df.iterrows():
                    basic_info = row['basic_info']
                    if isinstance(basic_info, dict) and 'gender' in basic_info:
                        genders.append(basic_info['gender'])
                
                if genders:
                    gender_counts = pd.Series(genders).value_counts()
                    fig = px.pie(gender_counts, names=gender_counts.index, values=gender_counts.values, 
                               title="Gender Distribution", color_discrete_sequence=GREEN_PALETTE)
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No gender data available")
        
        # Health Goals
        st.subheader("Health Goals Distribution")
        if 'health_goals' in filtered_users_df.columns:
            all_goals = []
            for _, row in filtered_users_df.iterrows():
                health_goals = row['health_goals']
                if isinstance(health_goals, list):
                    all_goals.extend(health_goals)
            
            if all_goals:
                goals_counts = pd.Series(all_goals).value_counts()
                fig = px.bar(goals_counts, x=goals_counts.index, y=goals_counts.values, 
                           title="Health Goals", color_discrete_sequence=[APP_GREEN])
                fig.update_xaxes(tickangle=45)
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No health goals data available")
        
        # Activity Levels
        st.subheader("Activity Level Distribution")
        if 'activity_level' in filtered_users_df.columns:
            activity_counts = filtered_users_df['activity_level'].value_counts()
            fig = px.bar(activity_counts, x=activity_counts.index, y=activity_counts.values, 
                       title="Activity Levels", color_discrete_sequence=[APP_GREEN])
            st.plotly_chart(fig, use_container_width=True)
        
        # Dietary Preferences
        st.subheader("Dietary Preferences")
        if 'dietary_preferences' in filtered_users_df.columns:
            dietary_data = {}
            for _, row in filtered_users_df.iterrows():
                dietary_prefs = row['dietary_preferences']
                if isinstance(dietary_prefs, dict):
                    for pref, value in dietary_prefs.items():
                        if isinstance(value, bool) and value:
                            dietary_data[pref] = dietary_data.get(pref, 0) + 1
            
            if dietary_data:
                fig = px.bar(x=list(dietary_data.keys()), y=list(dietary_data.values()), 
                           title="Dietary Preferences", color_discrete_sequence=[APP_GREEN])
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No dietary preferences data available")
        
        # User Cohorting - Weekly Retention Analysis
        st.subheader("User Retention Analysis")
        if 'created_at' in filtered_users_df.columns and 'onboarding_completed' in filtered_users_df.columns:
            # Convert created_at to datetime
            cohort_df = filtered_users_df.copy()
            cohort_df['created_at'] = pd.to_datetime(cohort_df['created_at'], errors='coerce')
            cohort_df = cohort_df.dropna(subset=['created_at'])
            
            if not cohort_df.empty:
                # Group by week of creation (handle timezone properly)
                cohort_df['cohort_week'] = cohort_df['created_at'].dt.tz_localize(None).dt.to_period('W').dt.start_time
                
                # Calculate retention rates
                weekly_stats = []
                for week_start in sorted(cohort_df['cohort_week'].unique()):
                    week_users = cohort_df[cohort_df['cohort_week'] == week_start]
                    total_users = len(week_users)
                    # Handle different data types for onboarding_completed
                    completed_onboarding = sum(1 for val in week_users['onboarding_completed'] 
                                             if val is True or str(val).lower() in ['true', '1', 'yes'])
                    
                    weekly_stats.append({
                        'week': week_start.strftime('%Y-%m-%d'),
                        'total_users': total_users,
                        'completed_onboarding': completed_onboarding,
                        'retention_rate': (completed_onboarding / total_users * 100) if total_users > 0 else 0
                    })
                
                retention_df = pd.DataFrame(weekly_stats)
                
                if not retention_df.empty:
                    # Retention rate over time
                    fig = px.line(retention_df, x='week', y='retention_rate', 
                                title='Weekly Onboarding Completion Rate',
                                labels={'week': 'Week', 'retention_rate': 'Completion Rate (%)'})
                    fig.update_traces(line_color=APP_GREEN)
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # User acquisition trend
                    fig2 = px.bar(retention_df, x='week', y='total_users', 
                                title='Weekly User Acquisition',
                                labels={'week': 'Week', 'total_users': 'New Users'},
                                color_discrete_sequence=[APP_GREEN])
                    st.plotly_chart(fig2, use_container_width=True)
                else:
                    st.info("No cohort data available")
            else:
                st.info("No valid date data for cohorting")
    
    else:
        st.info("No user data available")

# Tab 2: Meal Analytics
with tab2:
    st.header("Meal Logging Analytics")
    
    if not meals_df.empty:
        # Meal Type Distribution
        st.subheader("Meal Type Distribution")
        if 'mealType' in meals_df.columns:
            meal_counts = meals_df['mealType'].value_counts()
            fig = px.pie(meal_counts, names=meal_counts.index, values=meal_counts.values, 
                       title="Meals by Type", color_discrete_sequence=GREEN_PALETTE)
            st.plotly_chart(fig, use_container_width=True)
        
        # Top Foods
        st.subheader("Top 10 Most Logged Foods")
        if 'foodName' in meals_df.columns:
            # Normalize food names to handle case/whitespace duplicates
            normalized_foods = meals_df['foodName'].str.strip().str.title()
            top_foods = normalized_foods.value_counts().head(10)
            fig = px.bar(top_foods, x=top_foods.index, y=top_foods.values, 
                       title="Top Foods", color_discrete_sequence=[APP_GREEN])
            fig.update_xaxes(tickangle=45)
            st.plotly_chart(fig, use_container_width=True)
        
        # Source Distribution
        st.subheader("Meal Logging Source")
        if 'source' in meals_df.columns:
            # Filter out chatbot as it's not a valid logging source
            source_counts = meals_df[~meals_df['source'].str.lower().isin(['chatbot', 'chat'])]['source'].value_counts()
            fig = px.bar(source_counts, x=source_counts.index, y=source_counts.values, 
                       title="Camera vs Manual Entry", color_discrete_sequence=[APP_GREEN])
            st.plotly_chart(fig, use_container_width=True)
        
        # Meal Timing Heatmap
        st.subheader("Meal Logging Activity Heatmap")
        if 'createdAt' in meals_df.columns:
            timing_df = meals_df.copy()
            timing_df['createdAt'] = pd.to_datetime(timing_df['createdAt'], errors='coerce')
            timing_df = timing_df.dropna(subset=['createdAt'])
            
            if not timing_df.empty:
                # Extract hour and day of week
                timing_df['hour'] = timing_df['createdAt'].dt.hour
                timing_df['day_of_week'] = timing_df['createdAt'].dt.day_name()
                
                # Create pivot table for heatmap
                heatmap_data = timing_df.groupby(['day_of_week', 'hour']).size().unstack(fill_value=0)
                
                # Reorder days of week
                day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                heatmap_data = heatmap_data.reindex(day_order)
                
                # Create heatmap
                fig = go.Figure(data=go.Heatmap(
                    z=heatmap_data.values,
                    x=heatmap_data.columns,
                    y=heatmap_data.index,
                    colorscale=[[0, '#f0fdf4'], [0.5, '#4ade80'], [1, '#166534']],
                    hoverongaps=False
                ))
                
                fig.update_layout(
                    title='Meal Logging Activity by Day and Hour',
                    xaxis_title='Hour of Day',
                    yaxis_title='Day of Week'
                )
                
                st.plotly_chart(fig, width='stretch')
                
                # Peak activity hours
                hourly_activity = timing_df.groupby('hour').size()
                fig2 = px.bar(hourly_activity, x=hourly_activity.index, y=hourly_activity.values,
                            title='Meals Logged by Hour of Day',
                            labels={'x': 'Hour (0-23)', 'y': 'Number of Meals'},
                            color_discrete_sequence=[APP_GREEN])
                st.plotly_chart(fig2, use_container_width=True)
            else:
                st.info("No valid timestamp data for timing analysis")
    
    else:
        st.info("No meal data available")

# Tab 3: Feedback Analytics
with tab3:
    st.header("Feedback Analytics")
    
    if not feedback_df.empty:
        ratings_df, comments_df = flatten_feedback(feedback_df)

        if ratings_df.empty:
            st.info("Feedback submissions exist, but no rating answers were found.")
        else:
            avg_rating = ratings_df["rating"].mean()
            low_score_rate = ratings_df["low_score"].mean() * 100
            positive_rate = ratings_df["promoter_score"].mean() * 100
            unique_users = ratings_df["userId"].nunique()

            section_scores = (
                ratings_df.groupby("section_title")
                .agg(avg_rating=("rating", "mean"), responses=("rating", "count"), low_scores=("low_score", "sum"))
                .reset_index()
                .sort_values("avg_rating")
            )
            weakest_section = section_scores.iloc[0]

            question_scores = (
                ratings_df.groupby(["section_title", "question_label", "question"])
                .agg(avg_rating=("rating", "mean"), responses=("rating", "count"), low_scores=("low_score", "sum"))
                .reset_index()
                .sort_values(["avg_rating", "low_scores"], ascending=[True, False])
            )
            weakest_question = question_scores.iloc[0]

            metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
            with metric_col1:
                st.metric("Feedback Users", unique_users)
            with metric_col2:
                st.metric("Average Rating", f"{avg_rating:.2f}/5")
            with metric_col3:
                st.metric("Low-Score Rate", f"{low_score_rate:.0f}%")
            with metric_col4:
                st.metric("Positive Ratings", f"{positive_rate:.0f}%")

            st.subheader("Priority Fixes")
            insight_col1, insight_col2 = st.columns(2)
            with insight_col1:
                st.info(
                    f"Lowest section: **{weakest_section['section_title']}** "
                    f"({weakest_section['avg_rating']:.2f}/5, {int(weakest_section['low_scores'])} low scores)"
                )
            with insight_col2:
                st.warning(
                    f"Weakest question: **{weakest_question['question_label']}** "
                    f"({weakest_question['avg_rating']:.2f}/5)"
                )

            st.subheader("Section Health")
            section_chart_df = section_scores.sort_values("avg_rating", ascending=False)
            fig = px.bar(
                section_chart_df,
                x="avg_rating",
                y="section_title",
                orientation="h",
                text=section_chart_df["avg_rating"].round(2),
                title="Average Rating by Feedback Section",
                labels={"avg_rating": "Average Rating", "section_title": "Section"},
                color="avg_rating",
                color_continuous_scale=["#ef4444", "#f59e0b", APP_GREEN],
                range_x=[0, 5],
            )
            fig.update_layout(coloraxis_showscale=False)
            st.plotly_chart(fig, use_container_width=True)

            st.subheader("Question-Level Ratings")
            question_chart_df = question_scores.sort_values("avg_rating", ascending=True)
            fig = px.bar(
                question_chart_df,
                x="avg_rating",
                y="question_label",
                orientation="h",
                color="section_title",
                hover_data={"question": True, "responses": True, "low_scores": True, "avg_rating": ":.2f"},
                title="Weakest Questions First",
                labels={"avg_rating": "Average Rating", "question_label": "Question", "section_title": "Section"},
                range_x=[0, 5],
            )
            st.plotly_chart(fig, use_container_width=True)

            st.subheader("Rating Distribution")
            distribution_df = (
                ratings_df.groupby(["section_title", "rating"])
                .size()
                .reset_index(name="responses")
            )
            fig = px.bar(
                distribution_df,
                x="section_title",
                y="responses",
                color="rating",
                title="Ratings by Section",
                labels={"section_title": "Section", "responses": "Responses", "rating": "Rating"},
                color_continuous_scale=["#ef4444", "#f59e0b", APP_GREEN],
            )
            fig.update_xaxes(tickangle=35)
            st.plotly_chart(fig, use_container_width=True)

            low_score_examples = (
                ratings_df[ratings_df["low_score"]]
                .sort_values("submitted_at", ascending=False)
                [["section_title", "question_label", "rating"]]
                .head(12)
            )
            if not low_score_examples.empty:
                st.subheader("Recent Low Scores to Review")
                st.dataframe(low_score_examples, use_container_width=True, hide_index=True)

        if comments_df.empty:
            st.info("No written feedback comments available.")
        else:
            st.subheader("Improvement Themes")
            text_words = tokenize_feedback_text(comments_df["comment"])
            if text_words:
                word_counts = pd.Series(text_words).value_counts().head(20).reset_index()
                word_counts.columns = ["term", "mentions"]
                fig = px.bar(
                    word_counts,
                    x="mentions",
                    y="term",
                    orientation="h",
                    title="Common Terms in Written Feedback",
                    color_discrete_sequence=[APP_GREEN],
                )
                fig.update_layout(yaxis={"categoryorder": "total ascending"})
                st.plotly_chart(fig, use_container_width=True)

            sentiment_counts = comments_df["sentiment_label"].value_counts()
            fig = px.pie(
                sentiment_counts,
                names=sentiment_counts.index,
                values=sentiment_counts.values,
                title="Written Feedback Sentiment",
                color_discrete_sequence=GREEN_PALETTE,
            )
            st.plotly_chart(fig, use_container_width=True)

            recent_comments = (
                comments_df.sort_values("submitted_at", ascending=False)
                [["source", "section_title", "sentiment_label", "comment"]]
                .head(15)
            )
            st.subheader("Recent Written Feedback")
            st.dataframe(recent_comments, use_container_width=True, hide_index=True)
    
    else:
        st.info("No feedback data available")

# Footer
st.markdown("---")
st.markdown("Dashboard last updated: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
st.markdown("Data cached for 5 minutes. Refresh page to update.")
