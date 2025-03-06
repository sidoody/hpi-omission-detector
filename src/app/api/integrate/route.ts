// src/app/api/integrate/route.ts
import { integrateOmissionIntoHpi } from '@/services/openai-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { hpi, omission } = await request.json();
    
    if (!hpi || !omission) {
      return NextResponse.json(
        { error: 'HPI and omission data are required' },
        { status: 400 }
      );
    }
    
    const updatedHpi = await integrateOmissionIntoHpi(hpi, omission);
    return NextResponse.json({ updatedHpi });
  } catch (error) {
    console.error('Integration error:', error);
    return NextResponse.json(
      { error: 'Error integrating omission into HPI' },
      { status: 500 }
    );
  }
}