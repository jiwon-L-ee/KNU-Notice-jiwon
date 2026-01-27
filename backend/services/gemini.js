/**
 * @file gemini.js
 * @description Gemini 3 모델을 지원하는 AI 클라이언트 설정
 */

import { GoogleGenAI } from '@google/genai'; 
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * @constant aiModels
 */
export const aiModels = {
  flash: 'gemini-3-flash-preview',
  pro: 'gemini-3-pro-preview',
};

export default genAI;