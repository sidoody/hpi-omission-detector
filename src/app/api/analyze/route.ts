import { detectOmissions } from '@/services/openai-service';
import { NextRequest, NextResponse } from 'next/server';
import { AnalysisRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { transcript, hpi } = await request.json() as AnalysisRequest;
    
    if (!transcript || !hpi) {
      return NextResponse.json(
        { error: 'Transcript and HPI are required' },
        { status: 400 }
      );
    }
    
    const analysis = await detectOmissions(transcript, hpi);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Error analyzing documents' },
      { status: 500 }
    );
  }
}