import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

// Configuration to set up the AI model and plugins
const aiConfig = {
  model: gemini15Flash,  // Default model
  plugins: [googleAI()]  // Add Google AI plugin
};

// Initialize Genkit instance with the provided configuration
const ai = genkit(aiConfig);

// Object to track ongoing conversations
const conversations = {};

// Function to generate a response based on text
async function generateResponse(conversationId, inputText) {
  try {
    // If the conversation does not exist, create a new one
    if (!conversations[conversationId]) {
      conversations[conversationId] = []; // Initialize conversation history
    }

    // Add the current input to the conversation history
    conversations[conversationId].push(inputText);

    // Generate the response
    const { text } = await ai.generate(`Conversation ${conversationId}: ${inputText}`);
    
    // Add the AI response to the conversation history
    conversations[conversationId].push(text);

    return text; // Return the generated response
  } catch (error) {
    // Catch and log any errors during the AI generation process
    console.error(`Error in conversation ${conversationId}:`, error);
    return 'ERROR: ' + error;
  }
}

// Export the utility functions for other modules
export const aiUtils = {
  conversations,
  generateResponse
};