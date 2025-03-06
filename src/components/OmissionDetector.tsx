'use client';

import React, { useState } from 'react';
import { AnalysisResult, Omission, OmissionSignificance, OmissionType, omissionTypeSignificanceMap } from '@/types';

// Utility function to get significance color classes
function getSignificanceColorClasses(significance: OmissionSignificance): string {
  switch (significance) {
    case 'Critical': return 'bg-red-100 text-red-800 border border-red-200';
    case 'High': return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'Moderate': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'Minor': return 'bg-blue-100 text-blue-800 border border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
}

// Utility function to get type badge color
function getTypeColorClasses(type: OmissionType): string {
  switch (type) {
    case 'Recent medical events': return 'bg-purple-100 text-purple-800 border border-purple-200';
    case 'Omission of Symptoms': return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    case 'Medication Omission': return 'bg-green-100 text-green-800 border border-green-200';
    case 'Symptom details and characteristics': return 'bg-teal-100 text-teal-800 border border-teal-200';
    case 'People involved in interaction': return 'bg-pink-100 text-pink-800 border border-pink-200';
    case 'Documentation style': return 'bg-gray-100 text-gray-800 border border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
}

export default function OmissionDetector() {
  const [transcript, setTranscript] = useState<string>('');
  const [hpi, setHpi] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'updated-hpi'>('input');
  
  // New state to track which omissions have been added to the HPI
  const [addedOmissions, setAddedOmissions] = useState<Set<number>>(new Set());
  // New state to store the updated HPI
  const [updatedHpi, setUpdatedHpi] = useState<string>('');
  // State to track which omission is being added
  const [addingOmissionIndex, setAddingOmissionIndex] = useState<number | null>(null);
  // State to highlight recently added content
  const [recentlyAdded, setRecentlyAdded] = useState<{ index: number, content: string } | null>(null);

  const analyzeOmissions = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript, hpi }),
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const resultData = await response.json() as AnalysisResult;
      setResult(resultData);
      setActiveTab('results');
      
      // Initialize the updated HPI with the original HPI
      setUpdatedHpi(hpi);
      // Reset added omissions
      setAddedOmissions(new Set());
      // Reset recently added content
      setRecentlyAdded(null);
    } catch (error) {
      console.error('Error:', error);
      alert('Error analyzing documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTranscript('');
    setHpi('');
    setResult(null);
    setActiveTab('input');
    setAddedOmissions(new Set());
    setUpdatedHpi('');
    setRecentlyAdded(null);
  };

  // Function to add an omission to the HPI using the new API
  const addOmissionToHpi = async (omission: Omission, index: number) => {
    if (addedOmissions.has(index) || addingOmissionIndex !== null) {
      return; // Already added or another one is in progress
    }
    
    setAddingOmissionIndex(index);
    
    try {
      // Use the new API to intelligently integrate the omission
      const response = await fetch('/api/integrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          hpi: updatedHpi, // Use the most current version of HPI
          omission
        }),
      });
      
      if (!response.ok) {
        throw new Error('Integration failed');
      }
      
      const data = await response.json();
      const integratedHpi = data.updatedHpi;
      
      // Track what was added for highlighting
      setRecentlyAdded({
        index,
        content: omission.recommendation
      });
      
      // Create a new set with the added omission index
      const newAddedOmissions = new Set(addedOmissions);
      newAddedOmissions.add(index);
      setAddedOmissions(newAddedOmissions);
      
      // Update the HPI with the integrated content
      setUpdatedHpi(integratedHpi);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error integrating omission into HPI. Please try again.');
    } finally {
      setAddingOmissionIndex(null);
    }
  };

  // Function to count omissions by significance level
  const countBySignificance = (significance: OmissionSignificance): number => {
    if (!result) return 0;
    return result.omissions.filter(o => 
      omissionTypeSignificanceMap[o.type as OmissionType] === significance
    ).length;
  };

  // Function to sort omissions by significance
  const getSortedOmissions = () => {
    if (!result) return [];
    
    // Create a copy of the omissions array
    const sortedOmissions = [...result.omissions];
    
    // Define significance priority order
    const significancePriority = {
      'Critical': 0,
      'High': 1,
      'Moderate': 2,
      'Minor': 3
    };
    
    // Sort by significance
    sortedOmissions.sort((a, b) => {
      const aSig = omissionTypeSignificanceMap[a.type as OmissionType] as keyof typeof significancePriority;
      const bSig = omissionTypeSignificanceMap[b.type as OmissionType] as keyof typeof significancePriority;
      return significancePriority[aSig] - significancePriority[bSig];
    });
    
    return sortedOmissions;
  };

  // Function to find differences between original and updated HPI
  const findTextDifferences = (text1: string, text2: string): { text: string, added: boolean }[] => {
    // Split by paragraphs to maintain structure
    const paragraphs1 = text1.split('\n\n').filter(p => p.trim());
    const paragraphs2 = text2.split('\n\n').filter(p => p.trim());
    
    const result: { text: string, added: boolean }[] = [];
    
    // Special case: if the entire text is new (first time analysis)
    if (!text1 && text2) {
      return [{ text: text2, added: true }];
    }
    
    // Track which paragraphs in the original have been matched
    const matchedParagraphs = new Set<number>();
    
    // For each paragraph in the updated text, try to find a match in the original
    for (let i = 0; i < paragraphs2.length; i++) {
      const currentParagraph = paragraphs2[i];
      
      // Try to find this paragraph in the original text
      let foundMatch = false;
      
      for (let j = 0; j < paragraphs1.length; j++) {
        // Skip already matched paragraphs
        if (matchedParagraphs.has(j)) continue;
        
        // If paragraphs are identical or very similar
        if (paragraphs1[j] === currentParagraph) {
          result.push({ text: currentParagraph, added: false });
          matchedParagraphs.add(j);
          foundMatch = true;
          break;
        }
      }
      
      // If no match found, this is likely new content
      if (!foundMatch) {
        result.push({ text: currentParagraph, added: true });
      }
    }
    
    return result;
  };

  // Advanced rendering for highlighting changes
  const renderHighlightedHPI = () => {
    if (!hpi || !updatedHpi) return null;
    
    // Split by paragraphs to maintain structure
    const paragraphs1 = hpi.split('\n\n').filter(p => p.trim());
    const paragraphs2 = updatedHpi.split('\n\n').filter(p => p.trim());
    
    const result = [];
    
    // Track which paragraphs from original have been matched
    const matchedParagraphs = new Set<number>();
    
    // Process each paragraph in the updated HPI
    for (let i = 0; i < paragraphs2.length; i++) {
      const para = paragraphs2[i];
      
      // Check if this paragraph exists in the original
      let matched = false;
      
      for (let j = 0; j < paragraphs1.length; j++) {
        if (matchedParagraphs.has(j)) continue;
        
        if (paragraphs1[j] === para) {
          // Exact match - no highlighting
          result.push(
            <p key={`para-${i}`} className="mb-4">
              {para}
            </p>
          );
          matchedParagraphs.add(j);
          matched = true;
          break;
        } 
        // Check if this is a paragraph that has been modified
        else if (para.includes(paragraphs1[j]) || paragraphs1[j].includes(para)) {
          // Modified paragraph - light purple highlight
          result.push(
            <p key={`para-${i}`} className="mb-4 bg-purple-50/50 text-purple-950 rounded-sm px-1">
              {para}
            </p>
          );
          matchedParagraphs.add(j);
          matched = true;
          break;
        }
      }
      
      // If no match found, this is a new paragraph
      if (!matched) {
        result.push(
          <p key={`para-${i}`} className="mb-4 bg-purple-50 text-purple-900 rounded-sm px-1">
            {para}
          </p>
        );
      }
    }
    
    return <>{result}</>;
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto p-4 space-y-4">
      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">HPI Omission Detector</h1>
          <p className="text-gray-500 mt-1">Detect omissions in HPI documentation using LLM-powered analysis</p>
        </div>

        {/* Tab navigation */}
        <div className="border-b">
          <div className="flex">
            <button 
              className={`px-6 py-3 font-medium text-base transition-colors ${activeTab === 'input' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('input')}
            >
              Input
            </button>
            <button 
              className={`px-6 py-3 font-medium text-base transition-colors ${activeTab === 'results' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => result && setActiveTab('results')}
              disabled={!result}
            >
              Results
            </button>
            <button 
              className={`px-6 py-3 font-medium text-base transition-colors ${activeTab === 'updated-hpi' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => result && setActiveTab('updated-hpi')}
              disabled={!result}
            >
              Updated HPI
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'input' ? (
          <>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-800">Transcript</h3>
                <textarea 
                  placeholder="Paste the clinical encounter transcript here..." 
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={8}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm font-mono text-gray-700"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-800">History of Present Illness (HPI)</h3>
                <textarea 
                  placeholder="Paste the generated HPI here..." 
                  value={hpi}
                  onChange={(e) => setHpi(e.target.value)}
                  rows={8}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm font-mono text-gray-700"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex justify-between border-t">
              <button 
                onClick={resetForm}
                className="px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors font-medium text-gray-600"
              >
                Reset
              </button>
              <button 
                onClick={analyzeOmissions}
                disabled={!transcript || !hpi || loading}
                className={`px-6 py-2 rounded-md text-white font-medium relative transition-colors ${!transcript || !hpi || loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? (
                  <>
                    <span className="opacity-0">Analyze Omissions</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span>Analyzing...</span>
                    </div>
                  </>
                ) : (
                  <span>Analyze Omissions</span>
                )}
              </button>
            </div>
          </>
        ) : activeTab === 'results' ? (
          result && (
            <>
              <div className="p-6 space-y-6">
                {/* Summary section with improved styling */}
                <div>
                  <h3 className="text-xl font-medium mb-3 text-gray-800 border-b pb-2">Summary of Omission Analysis</h3>
                  <p className="text-gray-700 text-base leading-relaxed bg-white p-4 rounded-lg shadow-sm">{result.summary}</p>
                </div>

                {/* Detailed analysis with better spacing and contrast */}
                <div>
                  <h3 className="text-xl font-medium mb-4 text-gray-800 border-b pb-2">Detailed Omission Analysis</h3>
                  {result.omissions.length > 0 ? (
                    getSortedOmissions().map((omission, index) => {
                      const significance = omissionTypeSignificanceMap[omission.type as OmissionType];
                      const isAdded = addedOmissions.has(index);
                      
                      return (
                        <div key={index} className="border rounded-lg p-5 mb-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className={`${getTypeColorClasses(omission.type as OmissionType)} px-3 py-1 rounded-full text-sm font-medium inline-block text-center`}>
                                {omission.type}
                              </span>
                              <span className={`${getSignificanceColorClasses(significance)} px-3 py-1 rounded-full text-sm font-medium inline-block text-center`}>
                                {significance}
                              </span>
                            </div>
                            {/* Add to HPI button */}
                            <button
                              onClick={() => addOmissionToHpi(omission, index)}
                              disabled={isAdded || addingOmissionIndex !== null}
                              className={`px-4 py-2 rounded-md text-white font-medium relative ${isAdded ? 'bg-purple-300 cursor-not-allowed' : addingOmissionIndex === index ? 'bg-purple-500' : 'bg-purple-600 hover:bg-purple-700'}`}
                            >
                              {addingOmissionIndex === index ? (
                                <>
                                  <span className="opacity-0">Adding to HPI</span>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    <span>Adding...</span>
                                  </div>
                                </>
                              ) : isAdded ? (
                                'Added to HPI'
                              ) : (
                                'Add to HPI'
                              )}
                            </button>
                          </div>
                          <div className="space-y-3 mt-3">
                            <div>
                              <span className="font-medium text-gray-700">Description:</span> 
                              <p className="mt-1 text-gray-700">{omission.description}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-300 my-3">
                              <span className="font-medium text-gray-700">Evidence:</span> 
                              <p className="mt-1 text-gray-600 italic">"{omission.evidence}"</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Recommendation:</span> 
                              <p className="mt-1 text-gray-700">{omission.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-5 border rounded-lg bg-green-50 text-green-800">
                      No omissions detected. The HPI appears complete.
                    </div>
                  )}
                </div>

                {/* Overall assessment with better styling */}
                <div>
                  <h3 className="text-xl font-medium mb-3 text-gray-800 border-b pb-2">Overall Assessment</h3>
                  <p className="text-gray-700 bg-white p-4 rounded-lg shadow-sm">{result.assessment}</p>
                </div>

                {/* Analysis summary with improved card styling */}
                {result.omissions.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4 text-gray-800">Analysis Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-gray-100">
                        <div className="text-2xl font-bold text-gray-800">{result.omissions.length}</div>
                        <div className="text-sm text-gray-500">Total Omissions</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm text-center border-l-4 border-red-500">
                        <div className="text-2xl font-bold text-red-700">
                          {countBySignificance('Critical')}
                        </div>
                        <div className="text-sm text-gray-500">Critical</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm text-center border-l-4 border-orange-500">
                        <div className="text-2xl font-bold text-orange-700">
                          {countBySignificance('High')}
                        </div>
                        <div className="text-sm text-gray-500">High</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm text-center border-l-4 border-yellow-500">
                        <div className="text-2xl font-bold text-yellow-700">
                          {countBySignificance('Moderate')}
                        </div>
                        <div className="text-sm text-gray-500">Moderate</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm text-center border-l-4 border-blue-500">
                        <div className="text-2xl font-bold text-blue-700">
                          {countBySignificance('Minor')}
                        </div>
                        <div className="text-sm text-gray-500">Minor</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 flex justify-between border-t">
                <button 
                  onClick={() => setActiveTab('input')}
                  className="px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors font-medium text-gray-600"
                >
                  Back to Input
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab('updated-hpi')}
                    className={`px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium ${addedOmissions.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={addedOmissions.size === 0}
                  >
                    View Updated HPI
                  </button>
                  <button 
                    onClick={resetForm}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    Start New Analysis
                  </button>
                </div>
              </div>
            </>
          )
        ) : (
          result && (
            <>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-medium mb-3 text-gray-800 border-b pb-2">Compare Original and Updated HPI</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 text-gray-700">Original</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-line font-mono text-sm h-96 overflow-auto">
                        {hpi}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3 text-gray-700">Updated <span className="text-xs ml-2 text-purple-600">({addedOmissions.size} {addedOmissions.size === 1 ? 'change' : 'changes'})</span></h4>
                      <div className="bg-white p-4 rounded-lg border border-gray-200 whitespace-pre-line font-mono text-sm h-96 overflow-auto">
                        {renderHighlightedHPI()}
                      </div>
                    </div>
                  </div>
                  
                  {recentlyAdded && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <h4 className="font-medium text-purple-800 mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Last Addition
                      </h4>
                      <div className="text-sm text-purple-700">
                        <p className="font-medium">Added from: "{recentlyAdded.content}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 flex justify-between border-t">
                <button 
                  onClick={() => setActiveTab('results')}
                  className="px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors font-medium text-gray-600"
                >
                  Back to Results
                </button>
                <button 
                  onClick={resetForm}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Start New Analysis
                </button>
              </div>
            </>
          )
        )}
      </div>
      
      {/* Info Card */}
      <div className="bg-blue-50 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-medium mb-2 text-gray-800">About This Omission Detector</h3>
        <p className="text-gray-700 leading-relaxed">
          This application uses OpenAI's GPT-4 to analyze clinical documentation and
          identify potential omissions between transcripts and HPIs.
        </p>
        
        <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
          <h4 className="font-medium mb-2 flex items-center text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Usage Instructions
          </h4>
          <ol className="text-gray-700 text-sm space-y-1 ml-6 list-decimal">
            <li className="mb-1">Paste a clinical transcript in the first box</li>
            <li className="mb-1">Paste the corresponding HPI in the second box</li>
            <li className="mb-1">Click "Analyze Omissions" to detect gaps and inconsistencies</li>
            <li className="mb-1">Review the detailed analysis with evidence from the transcript</li>
            <li className="mb-1">Click "Add to HPI" on any omissions you want to include</li>
            <li>View the Updated HPI tab to see your enhanced documentation</li>
          </ol>
        </div>

        {/* Categorization Framework Legend */}
        <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
          <h4 className="font-medium mb-2 flex items-center text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Omission Categorization Framework
          </h4>
          <div className="mt-2 space-y-3">
            <div className="space-y-2">
              <h5 className="font-medium text-sm text-gray-700">Significance Levels by Omission Type:</h5>
              
              <div className="flex items-center gap-2">
                <span className="bg-red-100 text-red-800 border border-red-200 px-3 py-1 rounded-full text-xs">Critical</span>
                <span className="text-xs text-gray-600">-</span>
                <div className="flex flex-wrap gap-1">
                  <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full text-xs">Recent medical events</span>
                  <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full text-xs">Omission of Symptoms</span>
                  <span className="bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full text-xs">Medication Omission</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-orange-800 border border-orange-200 px-3 py-1 rounded-full text-xs">High</span>
                <span className="text-xs text-gray-600">-</span>
                <span className="bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full text-xs">Symptom details and characteristics</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full text-xs">Moderate</span>
                <span className="text-xs text-gray-600">-</span>
                <span className="bg-pink-100 text-pink-800 border border-pink-200 px-2 py-0.5 rounded-full text-xs">People involved in interaction</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs">Minor</span>
                <span className="text-xs text-gray-600">-</span>
                <span className="bg-gray-100 text-gray-800 border border-gray-200 px-2 py-0.5 rounded-full text-xs">Documentation style</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}