import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Brain, BarChart2, AlertTriangle, CheckCircle, 
  FileText, Zap, Filter, Search, Clock, ArrowRight, Loader2,
  BookmarkPlus, RefreshCw, ChevronDown, ChevronUp, MessageSquare
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { openaiService } from '../../services/openaiService';
// Import necessary types
import ReactMarkdown from 'react-markdown';

interface RevisionTopic {
  id: string;
  title: string;
  category: 'electronics' | 'communications' | 'computer-science' | 'cyber-security';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  completed?: boolean;
  score?: number;
  lastReviewed?: string;
  subjectArea?: string;
  status: 'weak' | 'average' | 'strong';
  lastRevisedDays: number | null;
  recommendedForRevision: boolean;
}

// Define the RevisionMaterial interface
interface RevisionMaterial {
  id: string;
  topicId: string;
  title: string;
  type: 'summary' | 'crash-sheet' | 'faq' | 'formula-sheet';
  content: string;
  createdAt: string;
}

type FilterType = 'all' | 'weak' | 'average' | 'strong' | 'recommended';
type SortType = 'alphabetical' | 'status' | 'lastRevised';
type SubjectFilter = 'all' | 'electronics' | 'communications' | 'computer-science' | 'cyber-security';

export default function RevisionHub() {
  const { state } = useApp();
  const navigate = useNavigate();
  
  const [topics, setTopics] = useState<RevisionTopic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<RevisionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<RevisionTopic | null>(null);
  const [revisionMaterials, setRevisionMaterials] = useState<RevisionMaterial[]>([]);
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('alphabetical');
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAccordions, setActiveAccordions] = useState<string[]>([]);

  // Process topics from app state
  useEffect(() => {
    if (state.topics.length > 0) {
      const processedTopics: RevisionTopic[] = state.topics.map(topic => {
        // Get topic progress from state
        const topicProgress = state.progress.topicProgress[topic.id] || { 
          score: 0, 
          attempts: 0, 
          completed: false, 
          markedConfusing: false 
        };
        
        // Determine status based on score
        let status: 'weak' | 'average' | 'strong';
        if (topicProgress.score >= 80) {
          status = 'strong';
        } else if (topicProgress.score >= 50) {
          status = 'average';
        } else {
          status = 'weak';
        }
        
        // Calculate days since last revision (mock data for now)
        const lastRevisedDays = topic.lastReviewed 
          ? Math.floor((new Date().getTime() - new Date(topic.lastReviewed).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        // Determine if recommended for revision
        // Logic: Weak topics, topics marked as confusing, or topics not revised in 7+ days
        const recommendedForRevision = 
          status === 'weak' || 
          topicProgress.markedConfusing || 
          (lastRevisedDays !== null && lastRevisedDays > 7);
        
        return {
          ...topic,
          status,
          lastRevisedDays,
          recommendedForRevision
        };
      });
      
      setTopics(processedTopics);
      setFilteredTopics(processedTopics);
    }
  }, [state.topics, state.progress.topicProgress]);

  // Apply filters, sorting, and search
  useEffect(() => {
    let result = [...topics];
    
    // Apply subject filter
    if (subjectFilter !== 'all') {
      result = result.filter(topic => topic.category === subjectFilter);
    }
    
    // Apply status filter
    if (filter === 'weak') {
      result = result.filter(topic => topic.status === 'weak');
    } else if (filter === 'average') {
      result = result.filter(topic => topic.status === 'average');
    } else if (filter === 'strong') {
      result = result.filter(topic => topic.status === 'strong');
    } else if (filter === 'recommended') {
      result = result.filter(topic => topic.recommendedForRevision);
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(topic => 
        topic.title.toLowerCase().includes(query) || 
        topic.subjectArea?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sort === 'alphabetical') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'status') {
      // Sort by status: weak first, then average, then strong
      const statusOrder = { weak: 0, average: 1, strong: 2 };
      result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    } else if (sort === 'lastRevised') {
      // Sort by last revised: null (never revised) first, then oldest to newest
      result.sort((a, b) => {
        if (a.lastRevisedDays === null && b.lastRevisedDays === null) return 0;
        if (a.lastRevisedDays === null) return -1;
        if (b.lastRevisedDays === null) return 1;
        return b.lastRevisedDays - a.lastRevisedDays;
      });
    }
    
    setFilteredTopics(result);
  }, [topics, filter, sort, subjectFilter, searchQuery]);

  const handleTopicSelect = (topic: RevisionTopic) => {
    setSelectedTopic(topic);
    // In a full implementation, you would fetch existing revision materials for this topic
    setRevisionMaterials([]);
  };

  const toggleAccordion = (id: string) => {
    setActiveAccordions(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const generateRevisionMaterial = async (type: 'summary' | 'crash-sheet' | 'faq' | 'formula-sheet') => {
    if (!selectedTopic) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      let prompt = '';
      let title = '';
      
      switch (type) {
        case 'summary':
          title = `Summary: ${selectedTopic.title}`;
          prompt = `
          Task: Generate a concise summary of "${selectedTopic.title}" for DCIO/Tech exam revision.
          
          Specific Requirements:
          1. Create a comprehensive but concise summary (300-500 words).
          2. Focus on key concepts, definitions, and principles.
          3. Highlight common exam topics and potential question areas.
          4. Format in Markdown with clear headings and bullet points.
          5. Tailor for a user with a "${state.user?.learningStyle || 'mixed'}" learning style.
          6. Include a "Key Takeaways" section at the end with 3-5 bullet points.
          `;
          break;
          
        case 'crash-sheet':
          title = `Crash Sheet: ${selectedTopic.title}`;
          prompt = `
          Task: Create a crash sheet for last-minute revision of "${selectedTopic.title}" for the DCIO/Tech exam.
          
          Specific Requirements:
          1. Create an ultra-condensed reference (maximum 250 words).
          2. Focus only on the most critical facts, formulas, and concepts.
          3. Use extremely concise bullet points, numbered lists, and tables where appropriate.
          4. Prioritize information most likely to appear in exam questions.
          5. Format in Markdown with clear organization.
          6. Design for quick scanning and memorization in the final hours before an exam.
          `;
          break;
          
        case 'faq':
          title = `FAQ: ${selectedTopic.title}`;
          prompt = `
          Task: Generate a set of Frequently Asked Questions (FAQs) about "${selectedTopic.title}" for DCIO/Tech exam preparation.
          
          Specific Requirements:
          1. Create 5-7 common questions and detailed answers.
          2. Focus on questions that address common misconceptions or challenging aspects.
          3. Include questions that frequently appear in exams.
          4. Provide clear, concise answers with examples where helpful.
          5. Format in Markdown with questions as headings.
          6. Tailor explanations for a user with a "${state.user?.learningStyle || 'mixed'}" learning style.
          `;
          break;
          
        case 'formula-sheet':
          title = `Formula Sheet: ${selectedTopic.title}`;
          prompt = `
          Task: Create a comprehensive formula sheet for "${selectedTopic.title}" for the DCIO/Tech exam.
          
          Specific Requirements:
          1. List all relevant formulas, equations, and mathematical relationships.
          2. For each formula, provide:
             - The formula itself (using proper notation)
             - Brief explanation of variables/terms
             - When/how to apply it
             - Any special cases or variations
          3. Organize logically by sub-topic or application.
          4. Format in Markdown with clear sections.
          5. Include any common formula transformations or derivations if relevant.
          `;
          break;
      }
      
      const content = await openaiService.generateText(prompt);
      
      // In a full implementation, you would save this to Firestore
      const newMaterial: RevisionMaterial = {
        id: Date.now().toString(),
        topicId: selectedTopic.id,
        title,
        type,
        content,
        createdAt: new Date().toISOString()
      };
      
      setRevisionMaterials(prev => [...prev, newMaterial]);
      
      // Auto-expand the new material
      setActiveAccordions(prev => [...prev, newMaterial.id]);
      
    } catch (error) {
      console.error(`Failed to generate ${type}:`, error);
      setError(`Failed to generate ${type}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
        <Brain className="h-8 w-8 mr-3 text-indigo-600"/>
        Smart Master Revision Hub
      </h1>
      
      <p className="text-gray-600 mb-8">
        ExamMaster AI has analyzed your performance and curated personalized revision materials to help you focus on the areas that need attention.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Topics List Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-indigo-600"/>
              Topics
            </h2>
            
            {/* Search and Filters */}
            <div className="mb-4">
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterType)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="weak">Weak Areas</option>
                  <option value="average">Average Areas</option>
                  <option value="strong">Strong Areas</option>
                  <option value="recommended">Recommended</option>
                </select>
                
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value as SubjectFilter)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Subjects</option>
                  <option value="electronics">Electronics</option>
                  <option value="communications">Communications</option>
                  <option value="computer-science">Computer Science</option>
                  <option value="cyber-security">Cyber Security</option>
                </select>
                
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortType)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="alphabetical">A-Z</option>
                  <option value="status">By Status</option>
                  <option value="lastRevised">Last Revised</option>
                </select>
              </div>
            </div>
            
            {/* Topics List */}
            <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
              {filteredTopics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No topics match your filters</p>
                </div>
              ) : (
                filteredTopics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedTopic?.id === topic.id
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{topic.title}</h3>
                        <p className="text-sm text-gray-600">{topic.subjectArea}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        topic.status === 'weak' 
                          ? 'bg-red-100 text-red-800' 
                          : topic.status === 'average'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {topic.status}
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {topic.lastRevisedDays === null 
                        ? 'Never revised' 
                        : topic.lastRevisedDays === 0 
                          ? 'Revised today' 
                          : topic.lastRevisedDays === 1 
                            ? 'Revised yesterday' 
                            : `Revised ${topic.lastRevisedDays} days ago`
                      }
                    </div>
                    
                    {topic.recommendedForRevision && (
                      <div className="mt-2 text-xs text-indigo-600 flex items-center">
                        <Brain className="h-3 w-3 mr-1" />
                        ExamMaster AI recommends revision
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Revision Materials Panel */}
        <div className="lg:col-span-2">
          {!selectedTopic ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Brain className="h-16 w-16 mx-auto mb-4 text-indigo-300" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Select a Topic to Begin Revision</h2>
              <p className="text-gray-600 mb-6">
                Choose a topic from the list to view and generate revision materials.
              </p>
              <div className="p-4 bg-indigo-50 rounded-lg inline-block text-left">
                <h3 className="font-medium text-indigo-800 mb-2 flex items-center">
                  <Zap className="h-4 w-4 mr-1" />
                  ExamMaster AI Tip
                </h3>
                <p className="text-indigo-700 text-sm">
                  Focus on topics marked as "weak" or "recommended" for the most effective study session.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{selectedTopic.title}</h2>
                  <p className="text-gray-600">{selectedTopic.subjectArea}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedTopic.status === 'weak' 
                    ? 'bg-red-100 text-red-800' 
                    : selectedTopic.status === 'average'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}>
                  {selectedTopic.status}
                </div>
              </div>
              
              {/* AI Insight */}
              {selectedTopic.recommendedForRevision && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <h3 className="font-medium text-indigo-800 mb-2 flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-indigo-600" />
                    ExamMaster AI Insight
                  </h3>
                  <p className="text-indigo-700">
                    {selectedTopic.status === 'weak' 
                      ? 'This topic has been identified as a weak area. Focused revision is highly recommended.'
                      : selectedTopic.lastRevisedDays && selectedTopic.lastRevisedDays > 7
                        ? `You haven't revised this topic in ${selectedTopic.lastRevisedDays} days. Consider reviewing it to maintain retention.`
                        : 'This topic has been flagged for revision based on your learning profile.'
                    }
                  </p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="mb-6 flex flex-wrap gap-3">
                <button 
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  onClick={() => navigate(`/lessons/${selectedTopic.id}/${encodeURIComponent(selectedTopic.title)}`)}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Full Lesson
                </button>
                
                <button 
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  onClick={() => navigate(`/quiz?topic=${selectedTopic.title}`)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Take Quiz
                </button>
              </div>
              
              {/* Generate Revision Materials */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Generate Revision Materials</h3>
                <div className="flex flex-wrap gap-2">
                  <button 
                    className="flex items-center px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
                    onClick={() => generateRevisionMaterial('summary')}
                    disabled={isGenerating}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Summary
                  </button>
                  
                  <button 
                    className="flex items-center px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                    onClick={() => generateRevisionMaterial('crash-sheet')}
                    disabled={isGenerating}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Crash Sheet
                  </button>
                  
                  <button 
                    className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                    onClick={() => generateRevisionMaterial('faq')}
                    disabled={isGenerating}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    FAQ
                  </button>
                  
                  <button 
                    className="flex items-center px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                    onClick={() => generateRevisionMaterial('formula-sheet')}
                    disabled={isGenerating}
                  >
                    <BookmarkPlus className="h-4 w-4 mr-1" />
                    Formula Sheet
                  </button>
                </div>
                
                {isGenerating && (
                  <div className="mt-4 flex items-center text-indigo-600">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>ExamMaster AI is generating content...</span>
                  </div>
                )}
                
                {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
              
              {/* Revision Materials */}
              <div className="space-y-4 max-h-[calc(100vh-450px)] overflow-y-auto pr-2">
                {revisionMaterials.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="mb-2">No revision materials yet</p>
                    <p className="text-sm">Generate materials using the buttons above</p>
                  </div>
                ) : (
                  revisionMaterials.map(material => (
                    <div key={material.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        onClick={() => toggleAccordion(material.id)}
                      >
                        <div className="flex items-center">
                          {material.type === 'summary' && <FileText className="h-5 w-5 mr-2 text-indigo-600" />}
                          {material.type === 'crash-sheet' && <Zap className="h-5 w-5 mr-2 text-orange-600" />}
                          {material.type === 'faq' && <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />}
                          {material.type === 'formula-sheet' && <BookmarkPlus className="h-5 w-5 mr-2 text-purple-600" />}
                          <span className="font-medium">{material.title}</span>
                        </div>
                        {activeAccordions.includes(material.id) 
                          ? <ChevronUp className="h-5 w-5 text-gray-500" />
                          : <ChevronDown className="h-5 w-5 text-gray-500" />
                        }
                      </button>
                      
                      {activeAccordions.includes(material.id) && (
                        <div className="p-4 prose prose-sm max-w-none">
                          <ReactMarkdown>{material.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
