// setup-assessment.js
import { db, doc, setDoc } from './js/firebase-config.js';

async function setupAssessmentContent() {
    try {
        await setDoc(doc(db, 'assessmentContent', 'current'), {
            title: 'Farm Budget Assessment',
            description: 'Complete this assessment to demonstrate your understanding of farm budget management.',
            scenario: 'You are the manager of Green Valley Farm, a mixed farming operation that produces crops (wheat, corn, and soybeans) and raises livestock (beef cattle). The farm owner has asked you to prepare a budget, analyze it, and make recommendations for improvements.',
            instructions: 'Create a budget for the farm, answer the analysis questions, and submit your assessment for review.',
            budgetSetupInstructions: 'Create a budget for Green Valley Farm by adding income and expense items. Include all major income sources and expense categories relevant to a mixed farming operation.',
            analysisInstructions: 'Based on your budget, answer the following questions to demonstrate your understanding of farm budget management.'
        });
        console.log('Assessment content set up successfully');
    } catch (error) {
        console.error('Error setting up assessment content:', error);
    }
}

setupAssessmentContent();