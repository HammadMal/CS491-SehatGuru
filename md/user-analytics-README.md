# SehatGuru User Analytics Dashboard

A comprehensive Streamlit-based analytics dashboard for SehatGuru app data stored in Firestore.

## ✨ Features

### **Current Features (Phase 1)**
- **Interactive Filters**: Date range and user segment filtering
- **User Profile Analytics**: Demographics, health goals, activity levels, dietary preferences
- **Meal Logging Analytics**: Meal types, top foods, logging sources, timing heatmaps
- **Feedback Analytics**: Submission trends, section analysis, sentiment analysis
- **User Cohorting**: Weekly retention and onboarding completion analysis
- **Data Export**: CSV download functionality for all datasets

### **Data Sources**
- **users**: User profiles and onboarding data
- **meals**: Meal logging data from camera and manual entry
- **feedback_submissions**: User feedback and ratings

## 🚀 Setup & Installation

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Firebase Credentials**:
   - Ensure `firebase-credentials.json` exists in the `../backend/` folder

3. **Run Dashboard**:
   ```bash
   streamlit run dashboard.py
   ```

4. **Access Dashboard**:
   - Open `http://localhost:8501` in your browser

## 📊 Analytics Overview

### **User Analytics**
- Age and gender distributions
- Health goals and dietary preferences
- Activity level breakdown
- Weekly user acquisition and retention rates
- Onboarding completion tracking

### **Meal Analytics**
- Meal type distribution (Breakfast/Lunch/Dinner/Snack)
- Top 10 most logged foods
- Camera vs manual entry sources
- Activity heatmaps by day/hour
- Peak meal logging times

### **Feedback Analytics**
- Feedback submission trends over time
- Sentiment analysis with polarity scoring
- Feedback sections breakdown
- Word frequency analysis
- Sentiment trends over time

## 🎯 Interactive Features

- **Date Range Filtering**: Analyze data for specific time periods
- **User Segmentation**: Filter by health goals, activity levels, onboarding status
- **Real-time Updates**: Data cached for 5 minutes with refresh capability
- **CSV Export**: Download filtered datasets for further analysis

## 🔄 Development Roadmap

### **Phase 2: Advanced Analytics (Next 2-4 weeks)**
- RFM Analysis and user lifecycle stages
- Predictive churn modeling
- Nutritional goal tracking
- Advanced meal pattern recognition

### **Phase 3: Business Intelligence (Next 1-2 months)**
- Real-time KPI monitoring
- Conversion funnel analysis
- Automated reporting
- Competitive benchmarking

### **Phase 4: AI-Powered Insights (Next 2-3 months)**
- Advanced NLP topic modeling
- Recommendation engine
- Automated anomaly detection
- Predictive alerting

### **Phase 5: Technical Enhancements (Ongoing)**
- Performance optimization
- Data quality governance
- Mobile-responsive design
- Advanced user experience features

## 🛠️ Technical Details

- **Framework**: Streamlit
- **Database**: Google Firestore
- **Authentication**: Firebase Admin SDK
- **Data Processing**: Pandas
- **Visualization**: Plotly
- **NLP**: TextBlob for sentiment analysis
- **Caching**: Streamlit's built-in caching (5-minute TTL)

## 📝 Notes

- All analytics are based on existing Firestore data structures
- No modifications are made to the backend or data
- Dashboard automatically handles missing or malformed data
- Sentiment analysis requires text data in feedback comments

## 🤝 Contributing

When adding new features:
1. Update `requirements.txt` for new dependencies
2. Add proper error handling and data validation
3. Include interactive filters where applicable
4. Add CSV export functionality for new datasets
5. Update this README with new features