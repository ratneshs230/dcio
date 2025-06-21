import React, { useState, useEffect } from 'react';
import backendService from '../../services/backendService';
import type { 
  LearningProfile, 
  TopicInteraction, 
  Lesson, 
  FormulaEntry, 
  FAQEntry 
} from '../../services/backendService';

function Dashboard() {
  const [backendStatus, setBackendStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [lessonTopic, setLessonTopic] = useState<string>('');
  const [lessonContent, setLessonContent] = useState<string>('');
  const [generatingLesson, setGeneratingLesson] = useState<boolean>(false);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileUsedInLesson, setProfileUsedInLesson] = useState<boolean>(false);
  
  // Today's lesson state
  const [todayLesson, setTodayLesson] = useState<Lesson | null>(null);
  const [todayLessonLoading, setTodayLessonLoading] = useState<boolean>(false);
  
  // Formula sheet state
  const [formulaEntries, setFormulaEntries] = useState<FormulaEntry[]>([]);
  const [formulaLoading, setFormulaLoading] = useState<boolean>(false);
  const [formulaTopic, setFormulaTopic] = useState<string>('');
  const [formulaConcept, setFormulaConcept] = useState<string>('');
  const [addingFormula, setAddingFormula] = useState<boolean>(false);
  
  // FAQ booklet state
  const [faqEntries, setFaqEntries] = useState<FAQEntry[]>([]);
  const [faqLoading, setFaqLoading] = useState<boolean>(false);
  const [faqTopic, setFaqTopic] = useState<string>('');
  const [faqQuestion, setFaqQuestion] = useState<string>('');
  const [addingFaq, setAddingFaq] = useState<boolean>(false);

  // Fetch the learning profile and today's lesson when the component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      setProfileLoading(true);
      setTodayLessonLoading(true);
      
      try {
        // Initialize Firestore first to ensure collections exist
        await backendService.initializeFirestore();
        
        // Fetch the learning profile
        const profile = await backendService.getLearningProfile();
        setLearningProfile(profile);
        
        // Fetch today's lesson
        try {
          const lesson = await backendService.getTodayLesson();
          setTodayLesson(lesson);
        } catch (error) {
          console.error('Error fetching today\'s lesson:', error);
        }
        
        // Fetch formula entries
        try {
          setFormulaLoading(true);
          const formulas = await backendService.getFormulaEntries();
          setFormulaEntries(formulas);
        } catch (error) {
          console.error('Error fetching formula entries:', error);
        } finally {
          setFormulaLoading(false);
        }
        
        // Fetch FAQ entries
        try {
          setFaqLoading(true);
          const faqs = await backendService.getFAQEntries();
          setFaqEntries(faqs);
        } catch (error) {
          console.error('Error fetching FAQ entries:', error);
        } finally {
          setFaqLoading(false);
        }
        
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setProfileLoading(false);
        setTodayLessonLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const checkBackendStatus = async () => {
    setLoading(true);
    try {
      const status = await backendService.checkBackendStatus();
      setBackendStatus(status ? 'Backend is running' : 'Backend is not available');
    } catch (error) {
      console.error('Error checking backend status:', error);
      setBackendStatus('Error checking backend status');
    } finally {
      setLoading(false);
    }
  };

  const generateLesson = async () => {
    if (!lessonTopic) {
      alert('Please enter a topic');
      return;
    }

    setGeneratingLesson(true);
    try {
      const result = await backendService.generateLesson(lessonTopic);
      // Use content_text if content is not available
      setLessonContent(result.content || result.content_text);
      // Default to false if profile_used is not defined
      setProfileUsedInLesson(result.profile_used || false);
    } catch (error) {
      console.error('Error generating lesson:', error);
      setLessonContent('Error generating lesson');
      setProfileUsedInLesson(false);
    } finally {
      setGeneratingLesson(false);
    }
  };

  // Track a topic interaction (view)
  const trackTopicView = async (topicId: string) => {
    try {
      await backendService.trackTopicInteraction({
        topic_id: topicId,
        interaction_type: 'view',
        time_spent: 0, // Just started viewing
        content_generated: false // No content generated for a view
      });
    } catch (error) {
      console.error('Error tracking topic view:', error);
    }
  };
  
  // Add a formula entry
  const addFormulaEntry = async () => {
    if (!formulaTopic || !formulaConcept) {
      alert('Please enter both topic and concept');
      return;
    }
    
    setAddingFormula(true);
    try {
      const formula = await backendService.addFormulaEntry(formulaTopic, formulaConcept);
      setFormulaEntries([formula, ...formulaEntries]);
      setFormulaTopic('');
      setFormulaConcept('');
    } catch (error) {
      console.error('Error adding formula entry:', error);
      alert('Error adding formula entry');
    } finally {
      setAddingFormula(false);
    }
  };
  
  // Add an FAQ entry
  const addFaqEntry = async () => {
    if (!faqTopic || !faqQuestion) {
      alert('Please enter both topic and question');
      return;
    }
    
    setAddingFaq(true);
    try {
      const faq = await backendService.addFAQEntry(faqTopic, faqQuestion);
      setFaqEntries([faq, ...faqEntries]);
      setFaqTopic('');
      setFaqQuestion('');
    } catch (error) {
      console.error('Error adding FAQ entry:', error);
      alert('Error adding FAQ entry');
    } finally {
      setAddingFaq(false);
    }
  };

  return (
    <div>
      <h1>Home Dashboard</h1>
      <p>Welcome to your personalized learning platform!</p>
      
      {/* Backend Status Check */}
      <div>
        <button onClick={checkBackendStatus} disabled={loading}>
          {loading ? 'Checking...' : 'Check Backend Status'}
        </button>
        {backendStatus && <p>{backendStatus}</p>}
      </div>
      
      {/* AI Learning Profile Display */}
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>AI Learning Profile</h2>
        {profileLoading ? (
          <p>Loading your learning profile...</p>
        ) : learningProfile ? (
          <div>
            <h3>Your Learning Insights</h3>
            <div style={{ marginBottom: '10px' }}>
              <h4>Strengths:</h4>
              {Object.keys(learningProfile.strengths).length > 0 ? (
                <ul>
                  {Object.entries(learningProfile.strengths).map(([topic, score]) => (
                    <li key={topic}>
                      {topic}: {score.toFixed(2)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No strengths identified yet. Complete some quizzes to build your profile!</p>
              )}
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <h4>Areas for Improvement:</h4>
              {Object.keys(learningProfile.weaknesses).length > 0 ? (
                <ul>
                  {Object.entries(learningProfile.weaknesses).map(([topic, score]) => (
                    <li key={topic}>
                      {topic}: {score.toFixed(2)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No weak areas identified yet. The AI will help identify areas to focus on.</p>
              )}
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <h4>Learning Preferences:</h4>
              {Object.keys(learningProfile.preferred_formats).length > 0 ? (
                <ul>
                  {Object.entries(learningProfile.preferred_formats).map(([format, count]) => (
                    <li key={format}>
                      {format}: {count} times
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No preferences detected yet. Use different content formats to help the AI learn your preferences.</p>
              )}
            </div>
            
            <div>
              <p><strong>Learning Pace:</strong> {learningProfile.learning_pace}</p>
              <p><strong>Difficulty Adjustment:</strong> {learningProfile.difficulty_adjustment}</p>
              <p><strong>Last Active:</strong> {learningProfile.last_active_date || 'Never'}</p>
            </div>
          </div>
        ) : (
          <p>Failed to load learning profile. Please try again later.</p>
        )}
      </div>
      
      {/* Lesson Generation */}
      <div style={{ marginTop: '20px' }}>
        <h2>Generate a Lesson</h2>
        <p>The AI Agent will tailor this lesson based on your learning profile.</p>
        <input
          type="text"
          value={lessonTopic}
          onChange={(e) => setLessonTopic(e.target.value)}
          placeholder="Enter a topic"
        />
        <button 
          onClick={() => {
            generateLesson();
            if (lessonTopic) {
              trackTopicView(lessonTopic);
            }
          }} 
          disabled={generatingLesson}
        >
          {generatingLesson ? 'Generating...' : 'Generate Lesson'}
        </button>
        {lessonContent && (
          <div style={{ marginTop: '10px' }}>
            <h3>Lesson Content:</h3>
            {profileUsedInLesson && (
              <div style={{ 
                backgroundColor: '#e0f7fa', 
                padding: '10px', 
                borderRadius: '5px',
                marginBottom: '10px',
                border: '1px solid #80deea'
              }}>
                <p style={{ color: '#00838f', fontWeight: 'bold' }}>
                  <span role="img" aria-label="AI">🤖</span> ExamMaster AI has personalized this content based on your learning profile!
                </p>
              </div>
            )}
            <p>{lessonContent}</p>
            
            {/* Content Interaction Buttons */}
            <div style={{ marginTop: '15px' }}>
              <h4>Request AI Agent Assistance:</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => backendService.trackTopicInteraction({
                    topic_id: lessonTopic,
                    interaction_type: 'clarity',
                    time_spent: 30,
                    content_generated: true // Content will be generated for clarity request
                  })}
                >
                  Need More Clarity
                </button>
                <button 
                  onClick={() => backendService.trackTopicInteraction({
                    topic_id: lessonTopic,
                    interaction_type: 'infographic',
                    time_spent: 30,
                    content_generated: true // Content will be generated for infographic request
                  })}
                >
                  Explain as Infographic
                </button>
                <button 
                  onClick={() => backendService.trackTopicInteraction({
                    topic_id: lessonTopic,
                    interaction_type: 'practice_questions',
                    time_spent: 30,
                    content_generated: true // Content will be generated for practice questions
                  })}
                >
                  Generate Practice Questions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Today's Lesson */}
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>Today's Lesson</h2>
        {todayLessonLoading ? (
          <p>Loading today's lesson...</p>
        ) : todayLesson ? (
          <div>
            <h3>{todayLesson.title}</h3>
            <p><strong>Type:</strong> {todayLesson.type}</p>
            <p><strong>Generated At:</strong> {new Date(todayLesson.generated_at).toLocaleString()}</p>
            <p><strong>Difficulty:</strong> {todayLesson.difficulty_level}</p>
            <p><strong>Estimated Time:</strong> {todayLesson.estimated_time_minutes || 15} minutes</p>
            
            <div style={{ marginTop: '10px' }}>
              <h4>Content:</h4>
              <div style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '5px',
                border: '1px solid #e0e0e0',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {todayLesson.content_text}
                </pre>
              </div>
            </div>
            
            {/* Content Interaction Buttons */}
            <div style={{ marginTop: '15px' }}>
              <h4>Request AI Agent Assistance:</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => backendService.trackTopicInteraction({
                    topic_id: todayLesson.topic_id,
                    interaction_type: 'clarity',
                    time_spent: 30,
                    content_generated: true
                  })}
                >
                  Need More Clarity
                </button>
                <button 
                  onClick={() => backendService.trackTopicInteraction({
                    topic_id: todayLesson.topic_id,
                    interaction_type: 'infographic',
                    time_spent: 30,
                    content_generated: true
                  })}
                >
                  Explain as Infographic
                </button>
                <button 
                  onClick={() => backendService.trackTopicInteraction({
                    topic_id: todayLesson.topic_id,
                    interaction_type: 'practice_questions',
                    time_spent: 30,
                    content_generated: true
                  })}
                >
                  Generate Practice Questions
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p>No lesson available for today. Generate a custom lesson below or check back later.</p>
        )}
      </div>
      
      {/* Formula Sheet */}
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>Formula Sheet</h2>
        <p>Add important formulas to your personalized sheet.</p>
        
        {/* Add Formula Form */}
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
          <h3>Add New Formula</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={formulaTopic}
              onChange={(e) => setFormulaTopic(e.target.value)}
              placeholder="Enter topic (e.g., Algorithms: Sorting)"
              style={{ padding: '8px' }}
            />
            <input
              type="text"
              value={formulaConcept}
              onChange={(e) => setFormulaConcept(e.target.value)}
              placeholder="Enter concept (e.g., Time Complexity of Bubble Sort)"
              style={{ padding: '8px' }}
            />
            <button 
              onClick={addFormulaEntry} 
              disabled={addingFormula}
              style={{ padding: '8px' }}
            >
              {addingFormula ? 'Adding...' : 'Add Formula'}
            </button>
          </div>
        </div>
        
        {/* Formula Entries */}
        <div>
          <h3>Your Formulas</h3>
          {formulaLoading ? (
            <p>Loading formula entries...</p>
          ) : formulaEntries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {formulaEntries.map((formula, index) => (
                <div key={index} style={{ 
                  padding: '10px', 
                  backgroundColor: formula.is_difficult ? '#fff8e1' : '#f5f5f5',
                  borderRadius: '5px',
                  border: formula.is_difficult ? '1px solid #ffecb3' : '1px solid #e0e0e0'
                }}>
                  <h4>Topic: {formula.topic_id.replace(/_/g, ' ')}</h4>
                  <div style={{ 
                    backgroundColor: '#ffffff', 
                    padding: '10px', 
                    borderRadius: '5px',
                    border: '1px solid #e0e0e0',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {formula.formula_text}
                    </pre>
                  </div>
                  <p><small>Added: {new Date(formula.added_at).toLocaleString()}</small></p>
                </div>
              ))}
            </div>
          ) : (
            <p>No formula entries yet. Add your first formula above!</p>
          )}
        </div>
      </div>
      
      {/* FAQ Booklet */}
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>FAQ Booklet</h2>
        <p>Add questions to your personalized FAQ booklet.</p>
        
        {/* Add FAQ Form */}
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
          <h3>Add New Question</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={faqTopic}
              onChange={(e) => setFaqTopic(e.target.value)}
              placeholder="Enter topic (e.g., Computer Networks)"
              style={{ padding: '8px' }}
            />
            <input
              type="text"
              value={faqQuestion}
              onChange={(e) => setFaqQuestion(e.target.value)}
              placeholder="Enter your question"
              style={{ padding: '8px' }}
            />
            <button 
              onClick={addFaqEntry} 
              disabled={addingFaq}
              style={{ padding: '8px' }}
            >
              {addingFaq ? 'Adding...' : 'Add Question'}
            </button>
          </div>
        </div>
        
        {/* FAQ Entries */}
        <div>
          <h3>Your FAQs</h3>
          {faqLoading ? (
            <p>Loading FAQ entries...</p>
          ) : faqEntries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {faqEntries.map((faq, index) => (
                <div key={index} style={{ 
                  padding: '10px', 
                  backgroundColor: '#f5f5f5',
                  borderRadius: '5px',
                  border: '1px solid #e0e0e0'
                }}>
                  <h4>Q: {faq.question}</h4>
                  <div style={{ 
                    backgroundColor: '#ffffff', 
                    padding: '10px', 
                    borderRadius: '5px',
                    border: '1px solid #e0e0e0',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {faq.answer}
                    </pre>
                  </div>
                  <p><small>Topic: {faq.topic_id.replace(/_/g, ' ')}</small></p>
                  <p><small>Added: {new Date(faq.added_at).toLocaleString()}</small></p>
                </div>
              ))}
            </div>
          ) : (
            <p>No FAQ entries yet. Add your first question above!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
