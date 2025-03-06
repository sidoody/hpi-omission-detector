# HPI Omission Detector

An AI-powered tool that analyzes clinical documentation to identify important information in transcripts that might be missing from History of Present Illness (HPI) documentation.

## Overview

The HPI Omission Detector compares clinical encounter transcripts with HPI documentation to identify potential omissions of clinically significant information. It leverages OpenAI's GPT-4 model to:

1. Analyze transcripts and HPIs to detect missing information
2. Categorize omissions by type and clinical significance
3. Provide specific recommendations for improving documentation
4. Intelligently integrate omissions into the original HPI

## Key Features

- **Comprehensive Analysis**: Identifies omissions across multiple categories including recent medical events, symptoms, medications, and more
- **Clinical Significance Ranking**: Color-coded indicators for Critical, High, Moderate, and Minor omissions
- **Detection with Evidence**: Includes direct quotes from the transcript as evidence for each identified omission
- **Interactive Integration**: One-click addition of missing content with intelligent placement in the appropriate context
- **Side-by-Side Comparison**: Easy visual comparison between original and updated HPI with highlighted changes

## Omission Categorization Framework

The detector categorizes omissions into six types, each with an assigned clinical significance level:

| Type | Description | Significance |
|------|-------------|-------------|
| Recent medical events | ER visits, hospitalizations, healthcare encounters | Critical |
| Omission of Symptoms | Key symptoms missing from HPI | Critical |
| Medication Omission | Missing medication details or recent changes | Critical |
| Symptom details and characteristics | Details about timing, location, modifiers | High |
| People involved in interaction | Interpreters, family members, caregivers | Moderate |
| Documentation style | Formatting and stylistic issues | Minor |

## Usage Instructions

1. Paste a clinical transcript in the first text area
2. Paste the corresponding HPI in the second text area
3. Click "Analyze Omissions" to detect gaps and inconsistencies
4. Review the detailed analysis with evidence from the transcript
5. Click "Add to HPI" on any omissions you want to include
6. View the Updated HPI tab to see your enhanced documentation

## Technical Implementation

- **Frontend**: React with TypeScript
- **Backend**: Next.js API routes
- **AI Integration**: OpenAI GPT-4o
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/hpi-omission-detector.git
   cd hpi-omission-detector
   ```

2. Install dependencies
   ```
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory with your OpenAI API key
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Start the development server
   ```
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser



## Security Considerations
- No data is stored persistently on the server
- All analysis happens through secure API calls to OpenAI



## Acknowledgements

- Built with [Next.js](https://nextjs.org/)
- Powered by [OpenAI](https://openai.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
