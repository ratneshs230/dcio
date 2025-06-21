import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, AlertTriangle, Zap, MessageSquare, Volume2, 
  Image as ImageIcon, Loader2, Brain, CheckCircle, 
  FileText, Lightbulb, BookmarkPlus, ArrowLeft, Server
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useApp } from '../../contexts/AppContext';
import { openaiService } from '../../services/openaiService';
import backendService from '../../services/backendService';
import { useNavigate } from 'react-router-dom';
import CollapsibleSection from './CollapsibleSection';

const markdownComponents = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    return !className?.includes('inline') && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

interface MarkdownSection {
  title?: string;
  content: string;
}

function parseSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split('\n');
  const sections: MarkdownSection[] = [];
  let currentTitle: string | undefined;
  let buffer: string[] = [];

  const push = () => {
    if (buffer.length > 0 || currentTitle) {
      sections.push({ title: currentTitle, content: buffer.join('\n') });
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = line.match(/^##\s+(.*)/);
    if (match) {
      push();
      currentTitle = match[1];
    } else {
      buffer.push(line);
    }
  }
  push();
  return sections;
}

interface LessonViewerProps {
  topicId: string; // Example: "electronics-semiconductors"
  topicName: string; // Example: "Semiconductor Physics"
}

type ContentType = 'lesson' | 'clarity' | 'infographic' | 'audio' | 'practice';

interface ContentState {
  type: ContentType;
  content: string;
}

export default function LessonViewer({ topicId, topicName }: LessonViewerProps) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  
  const [contentState, setContentState] = useState<ContentState>({ type: 'lesson', content: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // Reading progress
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [showKeyPoints, setShowKeyPoints] = useState(false);
  const [useBackendApi, setUseBackendApi] = useState(false);
  const [backendStatus, setBackendStatus] = useState<boolean | null>(null);

  const [selectedText, setSelectedText] = useState<string>('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  const lessonContentRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Track scroll position for progress indicator
  useEffect(() => {
    const handleScroll = () => {
      if (contentContainerRef.current) {
        const container = contentContainerRef.current;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        const currentProgress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        setProgress(currentProgress);
      }
    };

    const container = contentContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Check backend API status on component mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const isBackendRunning = await backendService.checkBackendStatus();
        setBackendStatus(isBackendRunning);
        console.log("Backend API status:", isBackendRunning ? "Running" : "Not available");
      } catch (error) {
        console.error("Error checking backend status:", error);
        setBackendStatus(false);
      }
    };
    
    checkBackend();
  }, []);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!state.user) {
        setError("User not found. Please complete onboarding.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Determine user's level for this specific topic from state.progress
        const topicProgress = state.progress.topicProgress[topicId];
        const userLevelForTopic = topicProgress?.score 
          ? topicProgress.score > 80 ? 'advanced' 
            : topicProgress.score > 50 ? 'intermediate' 
            : 'beginner'
          : 'beginner';
        
        let content = '';
        let extractedKeyPoints: string[] = [];
        
        // Use backend API if enabled and available
        if (useBackendApi && backendStatus) {
          try {
            const response = await backendService.generateLesson(topicName);
            content = response.content_text; // Use content_text from the backend response
            
            // For now, key points are still extracted from the content.
            // In a future iteration, the backend might return structured key points.
            const keyPointsRegex = /KEY_POINT:\s*(.*?)(?=\n|$)/g;
            const matches = [...content.matchAll(keyPointsRegex)];
            extractedKeyPoints = matches.map(match => match[1].trim());
            
          } catch (backendError) {
            console.error("Backend API error, falling back to OpenAI:", backendError);
            setUseBackendApi(false); // Disable backend API for this session
            throw new Error("Backend API failed, falling back to OpenAI");
          }
        } else {
          // Create a more sophisticated prompt based on the AI Prompting Guidelines
          const prompt = `
          Task: Generate a comprehensive lesson on "${topicName}" for the DCIO/Tech exam.

          Specific Requirements:
          1. The content should be tailored for a user with a "${state.user.learningStyle || 'mixed'}" learning style at a "${userLevelForTopic}" level.
          2. Focus on concepts relevant to electronics, communications, computer science, and cyber security as applicable.
          3. Include clear explanations, examples, and visual descriptions where appropriate.
          4. Structure the content with clear headings, subheadings, and bullet points.
          5. Include 5-7 key points at the end summarized as bullet points, prefixed with "KEY_POINT:".
          6. Output in Markdown format.
          7. Ensure the content is accurate, concise, and directly relevant to the DCIO/Tech exam.
          8. Avoid external links or references to resources outside the platform.
          `;
          
          content = await openaiService.generateText(prompt);
          
          // Extract key points from the content
          const keyPointsRegex = /KEY_POINT:\s*(.*?)(?=\n|$)/g;
          const matches = [...content.matchAll(keyPointsRegex)];
          extractedKeyPoints = matches.map(match => match[1].trim());
        }
        
        // Remove the KEY_POINT markers from the content
        const cleanedContent = content.replace(/KEY_POINT:\s*(.*?)(?=\n|$)/g, '• $1');
        
        setContentState({ type: 'lesson', content: cleanedContent });
        setKeyPoints(extractedKeyPoints);
        
        // Track that the user has viewed this lesson
        const topicData = state.topics.find(t => t.id === topicId);
        if (topicData && !topicData.completed) {
          // Update last viewed timestamp in a real implementation
        }
      } catch (err) {
        console.error(`Failed to load lesson for ${topicName}:`, err);
        setError(err instanceof Error ? err.message : "Failed to load lesson content. Ensure OpenAI API key is valid and has credit.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLesson();
  // Only re-fetch when topicId, topicName, or user changes
  // Avoid unnecessary re-fetches on every state change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, topicName, state.user]);

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    if (selection && text && text.length > 10 && lessonContentRef.current?.contains(selection.anchorNode)) {
      setSelectedText(text);
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setShowContextMenu(true);
    } else {
      setShowContextMenu(false);
      setSelectedText('');
    }
  };

  const handleContextMenuAction = async (action: 'infographic' | 'audio' | 'clarity' | 'practice') => {
    setShowContextMenu(false);
    if (!selectedText) return;

    setIsLoading(true);
    try {
      if (action === 'clarity') {
        const prompt = `
        Task: Re-explain the following text in simpler, clearer terms for a user with a "${state.user?.learningStyle || 'mixed'}" learning style.
        
        Text to explain: "${selectedText}"
        
        Specific Requirements:
        1. Break down complex concepts into simpler components.
        2. Use analogies or examples if helpful.
        3. Maintain technical accuracy while improving clarity.
        4. Format the response in Markdown.
        5. Keep the explanation concise but thorough.
        `;
        
        const simplerExplanation = await openaiService.generateText(prompt);
        setContentState({ 
          type: 'clarity', 
          content: `## Simplified Explanation\n\n${simplerExplanation}\n\n---\n\n[Return to full lesson](#)` 
        });
      } else if (action === 'infographic') {
        const prompt = `
        Task: Create a structured outline for an infographic based on the following text selection from a DCIO/Tech exam lesson.
        
        Text selection: "${selectedText}"
        
        Specific Requirements:
        1. Identify 3-5 key concepts that should be visualized.
        2. For each concept, provide a brief description of what should be shown.
        3. Suggest a logical flow/structure for the infographic.
        4. Include any important relationships between concepts that should be highlighted.
        5. Format the response in Markdown.
        6. Focus on creating a clear, educational outline suitable for a "${state.user?.learningStyle || 'mixed'}" learner.
        `;
        
        const infographicOutline = await openaiService.generateText(prompt);
        setContentState({ 
          type: 'infographic', 
          content: `## Infographic Outline\n\n${infographicOutline}\n\n---\n\n[Return to full lesson](#)` 
        });
      } else if (action === 'audio') {
        const prompt = `
        Task: Create a concise audio script summarizing the following text selection from a DCIO/Tech exam lesson.
        
        Text selection: "${selectedText}"
        
        Specific Requirements:
        1. Adapt the content to be heard rather than read.
        2. Use clear, straightforward language.
        3. Keep the script under 2 minutes when read aloud (approximately 250-300 words).
        4. Maintain all key technical information while optimizing for audio comprehension.
        5. Format in plain text optimized for text-to-speech conversion.
        `;
        
        const audioScript = await openaiService.generateText(prompt);
        setContentState({ 
          type: 'audio', 
          content: `## Audio Summary\n\n${audioScript}\n\n---\n\n[Return to full lesson](#)` 
        });
        
        // In a full implementation, you would convert this to actual audio
        // For now, we'll just simulate audio playback
        setAudioPlaying(true);
        setTimeout(() => setAudioPlaying(false), 5000);
      } else if (action === 'practice') {
        const prompt = `
        Task: Generate 3 practice questions based on the following text selection from a DCIO/Tech exam lesson.
        
        Text selection: "${selectedText}"
        
        Specific Requirements:
        1. Create 3 multiple-choice questions that test understanding of the key concepts.
        2. Each question should have 4 options with one correct answer.
        3. Include a brief explanation for each correct answer.
        4. Format the output in Markdown.
        5. Ensure questions are at an appropriate difficulty level for a "${state.user?.learningStyle || 'mixed'}" learner.
        
        Output Format:
        ## Practice Questions
        
        ### Question 1
        [Question text]
        
        A. [Option A]
        B. [Option B]
        C. [Option C]
        D. [Option D]
        
        **Correct Answer:** [Letter]
        
        **Explanation:** [Brief explanation]
        
        [Repeat for Questions 2-3]
        `;
        
        const practiceQuestions = await openaiService.generateText(prompt);
        setContentState({ 
          type: 'practice', 
          content: `${practiceQuestions}\n\n---\n\n[Return to full lesson](#)` 
        });
      }
    } catch (error) {
      console.error("Error generating content:", error);
      setError(`Failed to generate content: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToLesson = () => {
    if (contentState.type !== 'lesson') {
      // Restore the original lesson content
      setContentState({ type: 'lesson', content: contentState.content });
    }
    setShowContextMenu(false);
    setSelectedText('');
  };

  const handleMarkAsCompleted = () => {
    dispatch({ type: 'COMPLETE_TOPIC', payload: topicId });
    // Show a success message or navigate to the next recommended topic
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Lesson</h2>
        <p className="text-gray-600">ExamMaster AI is preparing your personalized lesson...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl shadow-lg max-w-4xl mx-auto">
        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Lesson</h2>
        <p className="text-red-700 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!contentState.content) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-xl shadow-lg max-w-4xl mx-auto">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">No Content Available</h2>
        <p className="text-gray-600 mb-6">No lesson content is available for {topicName}.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <button 
            onClick={() => navigate('/dashboard')}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
            <BookOpen className="h-7 w-7 mr-3 text-indigo-600 hidden sm:inline-block"/>
            {topicName}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowKeyPoints(!showKeyPoints)}
            className="flex items-center px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
          >
            <Lightbulb className="w-4 h-4 mr-1" />
            {showKeyPoints ? 'Hide Key Points' : 'Show Key Points'}
          </button>
          
          {backendStatus !== null && (
            <button
              onClick={() => setUseBackendApi(!useBackendApi)}
              className={`flex items-center px-3 py-2 ${
                backendStatus 
                  ? useBackendApi 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              } rounded-lg hover:bg-blue-200 transition-colors text-sm`}
              disabled={!backendStatus}
              title={backendStatus ? 'Toggle between backend API and OpenAI' : 'Backend API not available'}
            >
              <Server className="w-4 h-4 mr-1" />
              {useBackendApi ? 'Using Backend API' : 'Use Backend API'}
            </button>
          )}
          
          <button
            onClick={handleMarkAsCompleted}
            className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Mark as Completed
          </button>
        </div>
      </div>
      
      {/* Key Points Panel (Collapsible) */}
      {showKeyPoints && keyPoints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-yellow-600" />
            Key Points from ExamMaster AI
          </h3>
          <ul className="space-y-2">
            {keyPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-yellow-900">{point}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
      
      {/* Content Container */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Main Content */}
        <div
          ref={contentContainerRef}
          className="flex-grow md:max-h-[calc(100vh-220px)] md:overflow-y-auto pr-2 scroll-smooth"
          onClick={() => showContextMenu && setShowContextMenu(false)}
          onScroll={() => showContextMenu && setShowContextMenu(false)}
          tabIndex={0}
          aria-label="Lesson Content"
        >
          {contentState.type === 'lesson' ? (
            <motion.div 
              ref={lessonContentRef}
              onMouseUp={handleMouseUp}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="prose prose-indigo lg:prose-xl max-w-none bg-white p-6 md:p-8 rounded-xl shadow-lg"
            >
            {parseSections(contentState.content).map((section, idx) => (
              section.title ? (
                <CollapsibleSection key={idx} title={section.title}>
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                    {section.content}
                  </ReactMarkdown>
                </CollapsibleSection>
              ) : (
                <ReactMarkdown
                  key={idx}
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={markdownComponents}
                >
                  {section.content}
                </ReactMarkdown>
              )
            ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="prose prose-indigo lg:prose-lg max-w-none bg-white p-6 md:p-8 rounded-xl shadow-lg"
            >
              {contentState.type === 'audio' && audioPlaying && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
                  <Volume2 className="h-5 w-5 text-blue-600 animate-pulse mr-2" />
                  <span className="text-blue-700">Audio playing...</span>
                </div>
              )}
              
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={markdownComponents}
              >
                {contentState.content}
              </ReactMarkdown>
              
              <button
                onClick={handleReturnToLesson}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Return to Full Lesson
              </button>
            </motion.div>
          )}
          
          {/* Context Menu */}
          {showContextMenu && selectedText && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed bg-white shadow-2xl rounded-lg p-2 border z-50 text-sm"
              style={{ top: contextMenuPosition.y + 5, left: contextMenuPosition.x + 5 }}
              onMouseLeave={() => setShowContextMenu(false)}
              role="menu"
              aria-label="Context Menu"
            >
              <button
                onClick={() => handleContextMenuAction('infographic')}
                className="flex items-center w-full text-left px-3 py-2 hover:bg-indigo-50 rounded"
                role="menuitem"
              >
                <ImageIcon className="w-4 h-4 mr-2 text-indigo-600"/>
                Explain as Infographic
              </button>
              <button
                onClick={() => handleContextMenuAction('audio')}
                className="flex items-center w-full text-left px-3 py-2 hover:bg-indigo-50 rounded"
                role="menuitem"
              >
                <Volume2 className="w-4 h-4 mr-2 text-indigo-600"/>
                Audio Overview
              </button>
              <button
                onClick={() => handleContextMenuAction('clarity')}
                className="flex items-center w-full text-left px-3 py-2 hover:bg-indigo-50 rounded"
                role="menuitem"
              >
                <MessageSquare className="w-4 h-4 mr-2 text-indigo-600"/>
                Need More Clarity
              </button>
              <button
                onClick={() => handleContextMenuAction('practice')}
                className="flex items-center w-full text-left px-3 py-2 hover:bg-indigo-50 rounded"
                role="menuitem"
              >
                <FileText className="w-4 h-4 mr-2 text-indigo-600"/>
                Practice Questions
              </button>
            </motion.div>
          )}
        </div>
        
        {/* Sidebar with AI Actions */}
        <div className="md:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-lg p-4 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-indigo-600" />
              ExamMaster AI
            </h3>
            
            <div className="space-y-3">
              <button 
                className="w-full flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm text-left"
                onClick={() => navigate(`/quiz?topic=${topicName}`)}
              >
                <Zap className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Quiz Me Now</span>
              </button>
              
              <button 
                className="w-full flex items-center px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm text-left"
                onClick={() => dispatch({ type: 'MARK_TOPIC_CONFUSING', payload: topicId })}
              >
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Mark as Confusing</span>
              </button>
              
              <button 
                className="w-full flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm text-left"
                onClick={() => alert('Formula sheet feature coming soon!')}
              >
                <BookmarkPlus className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Add to Formula Sheet</span>
              </button>
              
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Select text for more options:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className="flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1 text-gray-400" />
                    Need More Clarity
                  </li>
                  <li className="flex items-center">
                    <ImageIcon className="w-3 h-3 mr-1 text-gray-400" />
                    Explain as Infographic
                  </li>
                  <li className="flex items-center">
                    <Volume2 className="w-3 h-3 mr-1 text-gray-400" />
                    Audio Overview
                  </li>
                  <li className="flex items-center">
                    <FileText className="w-3 h-3 mr-1 text-gray-400" />
                    Practice Questions
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
