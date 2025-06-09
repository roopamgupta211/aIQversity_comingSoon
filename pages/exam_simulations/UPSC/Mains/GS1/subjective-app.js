// Subjective Examination System: subjective-app.js
// ==================== CONFIGURATION ====================
const CONFIG = {
    TIMER_INTERVAL: 3600,
    SCORE_THRESHOLDS: { EXCELLENT: 60, GOOD: 40, AVERAGE: 30 },
    MARKING_SCHEME: { MAX_MARKS: 10 },
    EXAM_CONTEXT: {
        NAME: 'UPSC Practice',
        DESCRIPTION: 'UPSC General Studies practice session',
        MARKING_INFO: 'Comprehensive evaluation based on content, structure, and presentation',
        TARGET_SCORE: '50% and above for competitive scores'
    }
};

const API_CONFIG = {
    EMAIL: {
        SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyqQ0QocnrUgrIC3h3Tv6tXZHBlgVTnhiwmdXZiJBPO1-lbB8HgMsNcMEzx32gvjWeZhA/exec'
    },
    GEMINI: {
        API_KEY: 'AIzaSyBr38XKvBXOz4eN8r9lkEuj2izj4Ag_zsg',
        MODEL: 'gemini-2.0-flash',
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/'
    }
};

const SELECTORS = {
    LOADING: 'loading',
    EXAM_INTERFACE: 'examInterface', 
    RESULTS_INTERFACE: 'resultsInterface',
    REVIEW_INTERFACE: 'reviewInterface',
    QUESTION_LIST: 'questionList',
    TIMER: 'timer'
};

// ==================== SAMPLE DATA ====================
const SAMPLE_EXAM_DATA = [
    {
        "question_id": 1,
        "marks": 10,
        "word_limit": 150,
        "Question": "The rock-cut architecture of the Mauryan period is a testament to the dynasty's imperial vision and multicultural influences. Discuss. (150 words)",
        "Solution": "The rock-cut architecture of the Mauryan period, particularly the Barabar and Nagarjuni caves, stands as a powerful symbol of Emperor Ashoka's imperial vision and the synthesis of diverse cultural influences...",
        "tips_and_tricks": [
            "Start with a clear thesis statement",
            "Provide specific examples like the Barabar and Nagarjuni caves",
            "Discuss the unique features like the Mauryan polish"
        ],
        "classification": {
            "paper": "UPSC GS 1",
            "subject": "Indian Heritage and Culture",
            "topic": "Indian Architecture"
        },
        "difficulty_level": "moderate",
        "blooms_taxonomy": "Analysis"
    }
];

// ==================== UTILITIES ====================
class Utils {
    static hideElement(id) {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    }

    static showElement(id) {
        const element = document.getElementById(id);
        if (element) element.classList.remove('hidden');
    }

    static switchInterface(hideId, showId) {
        this.hideElement(hideId);
        this.showElement(showId);
    }

    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    static handleError(message, error) {
        console.error(message, error);
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `<h2>Error</h2><p>${message}. Please refresh and try again.</p>`;
        }
    }

    static countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static async compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

    static animateCounter(element, start, end, suffix = '') {
        const duration = 1000;
        const increment = (end - start) / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current) + suffix;
        }, 16);
    }
}

// ==================== STATE MANAGEMENT ====================
class ExamState {
    constructor() {
        this.reset();
    }

    reset() {
        this.examData = [];
        this.currentQuestion = 0;
        this.answers = {};
        this.startTime = null;
        this.timerInterval = null;
        this.examDuration = 0;
        this.currentAnswerMode = 'text';
        this.imageCache = {};
        this.analysisResults = {};
        this.progressTimeout = null;
        this.charts = {};
        this.feedbackMessages = {};
        this.clearTimer();
        this.destroyCharts();
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.progressTimeout) {
            clearTimeout(this.progressTimeout);
            this.progressTimeout = null;
        }
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

const examState = new ExamState();

// ==================== DATA MANAGEMENT ====================
class DataManager {
    static async loadExamData() {
        try {
            const response = await fetch('exam-data.json');
            if (!response.ok) throw new Error('Failed to load exam data file');
            
            const jsonText = await response.text();
            
            const rawData = JSON.parse(jsonText);
            
            // Debug: Check question IDs
            const questionIds = rawData.map(q => q.question_id);
            
            // Debug: Check for duplicate IDs
            const uniqueIds = [...new Set(questionIds)];
            
            if (questionIds.length !== uniqueIds.length) {
                console.error('DUPLICATE QUESTION IDs DETECTED!');
                const duplicates = questionIds.filter((id, index) => questionIds.indexOf(id) !== index);
                console.error('Duplicate IDs:', duplicates);
            }
            
            // Debug: Validate each question and log any issues
            const validQuestions = [];
            rawData.forEach((question, index) => {
                const issues = [];
                if (!question.Question) issues.push('missing Question');
                if (!question.marks) issues.push('missing marks');
                if (!question.word_limit) issues.push('missing word_limit');
                if (!question.Solution) issues.push('missing Solution');
                if (!question.classification) issues.push('missing classification');
                
                if (issues.length > 0) {
                    console.error(`Question ${question.question_id || index + 1} has issues:`, issues, question);
                } else {
                    validQuestions.push(question);
                }
            });
            
            examState.examData = validQuestions;
            
            if (examState.examData.length === 0) {
                throw new Error('No valid exam data available');
            }
            
        } catch (error) {
            console.error('JSON loading error:', error);
            console.warn('Using sample data due to error:', error.message);
            examState.examData = SAMPLE_EXAM_DATA;
        }
    }

    static storeResults(results) {
        localStorage.setItem('subjectiveExamResults', JSON.stringify(results));
    }

    static getResults() {
        const stored = localStorage.getItem('subjectiveExamResults');
        return stored ? JSON.parse(stored) : null;
    }

    static clearAllData() {
        localStorage.clear();
        sessionStorage.clear();
        
        Object.values(examState.imageCache).forEach(imageData => {
            if (imageData.file) {
                URL.revokeObjectURL(imageData.file);
            }
        });
    }
}

// ==================== TIMER MANAGEMENT ====================
class TimerManager {
    static initialize() {
        examState.startTime = new Date();
        this.showTimer();
        this.start();
    }

    static start() {
        examState.timerInterval = setInterval(this.update.bind(this), CONFIG.TIMER_INTERVAL);
    }

    static update() {
        const elapsed = Math.floor((new Date() - examState.startTime) / 1000);
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = Utils.formatTime(elapsed);
        }
    }

    static stop() {
        examState.clearTimer();
        examState.examDuration = Math.floor((new Date() - examState.startTime) / 1000);
    }

    static showTimer() {
        Utils.hideElement('homeButton');
        Utils.showElement('timer');
    }

    static hideTimer() {
        Utils.showElement('homeButton');
        Utils.hideElement('timer');
    }
}

// ==================== QUESTION MANAGEMENT ====================
class QuestionManager {
    static createNavigation() {
        const questionList = document.getElementById('questionList');
        if (!questionList) return;
        
        questionList.innerHTML = '';
        
        examState.examData.forEach((_, index) => {
            const btn = document.createElement('button');
            btn.className = 'question-nav-btn';
            btn.textContent = index + 1;
            btn.onclick = () => this.load(index);
            if (index === 0) btn.classList.add('current');
            questionList.appendChild(btn);
        });
    }

    static updateNavigation() {
        const buttons = document.querySelectorAll('.question-nav-btn');
        buttons.forEach((btn, index) => {
            btn.classList.toggle('current', index === examState.currentQuestion);
            btn.classList.toggle('answered', examState.answers[index] !== undefined);
        });
    }

    static async load(index) {
        this.saveCurrentAnswer();
        examState.currentQuestion = index;
        const question = examState.examData[index];
        
        await this.updateQuestionDisplay(question, index);
        this.loadAnswer(index);
        this.updateNavigationButtons(index);
        this.updateNavigation();
        // this.setupAnswerModeHandlers();
    }

    static async updateQuestionDisplay(question, index) {
        const elements = {
            questionNumber: document.getElementById('questionNumber'),
            questionMeta: document.getElementById('questionMeta'),
            questionText: document.getElementById('questionText'),
            wordLimit: document.getElementById('wordLimit')
        };
        
        if (elements.questionNumber) {
            elements.questionNumber.textContent = `Question ${index + 1} of ${examState.examData.length}`;
        }
        
        if (elements.questionMeta) {
            elements.questionMeta.innerHTML = `
                <span class="marks-badge">${question.marks} marks</span>
                <span class="difficulty-badge ${question.difficulty_level}">${question.difficulty_level}</span>
                <span class="subject-badge">${question.classification.subject}</span>
                <span class="aiqversity-badge" title="Analyzed using aIQversity's multi-level classification system">🧠 aIQ Deep Analysis</span>
            `;
        }
        
        if (elements.questionText) {
            elements.questionText.innerHTML = `
                <div class="question-content">
                    <div class="question-main">${question.Question}</div>
                    ${question.classification ? `
                        <div class="question-classification-flow">
                            <div class="classification-header">
                                <strong>aIQversity Classification Framework</strong>
                            </div>
                            <div class="classification-breadcrumb">
                                <span class="breadcrumb-item subject-item">
                                    <span class="item-value">${question.classification.subject}</span>
                                </span>
                                <span class="breadcrumb-arrow">→</span>
                                <span class="breadcrumb-item topic-item">
                                    <span class="item-value">${question.classification.topic}</span>
                                </span>
                                ${question.classification.subtopic ? `
                                    <span class="breadcrumb-arrow">→</span>
                                    <span class="breadcrumb-item subtopic-item">
                                        <span class="item-value">${question.classification.subtopic}</span>
                                    </span>
                                ` : ''}
                                ${question.classification.sub_subtopic ? `
                                    <span class="breadcrumb-arrow">→</span>
                                    <span class="breadcrumb-item sub-subtopic-item">
                                        <span class="item-value">${question.classification.sub_subtopic}</span>
                                    </span>
                                ` : ''}
                                ${question.classification.concept ? `
                                    <span class="breadcrumb-arrow">→</span>
                                    <span class="breadcrumb-item concept-item">
                                        <span class="item-value">${question.classification.concept}</span>
                                    </span>
                                ` : ''}
                            </div>
                            <div class="classification-footer">
                                <small>📈 Your answer will be analyzed at each classification level for comprehensive feedback</small>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        if (elements.wordLimit) {
            elements.wordLimit.textContent = `Word limit: ${question.word_limit} words`;
        }
    }

    static loadAnswer(index) {
        const answer = examState.answers[index];
        const textArea = document.getElementById('answerText');
        
        if (answer) {
            if (answer.type === 'text') {
                this.setAnswerMode('text');
                if (textArea) {
                    textArea.value = answer.content || '';
                    this.updateWordCount();
                }
            } else if (answer.type === 'image') {
                this.setAnswerMode('image');
                this.displayImagePreview(answer.file, answer.filename, answer.filesize);
            }
        } else {
            this.setAnswerMode('text');
            if (textArea) textArea.value = '';
            this.updateWordCount();
        }
        
        this.updateAnswerStatus();
        this.updateSaveButton();
    }

    static setAnswerMode(mode) {
        const textRadio = document.querySelector('input[value="text"]');
        const imageRadio = document.querySelector('input[value="image"]');
        
        if (mode === 'text' && textRadio) {
            textRadio.checked = true;
        } else if (mode === 'image' && imageRadio) {
            imageRadio.checked = true;
        }
        
        this.switchAnswerMode(mode);
    }

    static setupAnswerModeHandlers() {
        // Remove existing radio button listeners
        const answerModeRadios = document.querySelectorAll('input[name="answerMode"]');
        answerModeRadios.forEach(radio => {
            const newRadio = radio.cloneNode(true);
            radio.parentNode.replaceChild(newRadio, radio);
            newRadio.addEventListener('change', (e) => {
                this.switchAnswerMode(e.target.value);
            });
        });

        // Remove existing textarea listeners
        const textArea = document.getElementById('answerText');
        if (textArea) {
            const newTextArea = textArea.cloneNode(true);
            textArea.parentNode.replaceChild(newTextArea, textArea);
            newTextArea.addEventListener('input', () => {
                this.updateWordCount();
                this.updateSaveButton();
            });
        }

        this.setupImageUpload();
    }

    static switchAnswerMode(mode) {
        examState.currentAnswerMode = mode;
        const textSection = document.getElementById('textAnswerSection');
        const imageSection = document.getElementById('imageAnswerSection');
        
        if (mode === 'text') {
            Utils.showElement('textAnswerSection');
            Utils.hideElement('imageAnswerSection');
        } else {
            Utils.hideElement('textAnswerSection');
            Utils.showElement('imageAnswerSection');
        }
        
        this.updateSaveButton();
    }

    static setupImageUpload() {
        const uploadArea = document.getElementById('imageUploadArea');
        const fileInput = document.getElementById('imageUpload');
        
        if (!uploadArea || !fileInput) return;

        uploadArea.addEventListener('click', () => fileInput.click());
        
        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                uploadArea.classList.toggle('dragover', eventName === 'dragover');
            });
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) this.handleImageFile(files[0]);
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this.handleImageFile(e.target.files[0]);
        });
    }

    static async handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB.');
            return;
        }
        
        try {
            const compressedFile = await Utils.compressImage(file);
            const base64 = await Utils.fileToBase64(compressedFile);
            
            examState.imageCache[examState.currentQuestion] = {
                file: compressedFile,
                base64: base64,
                filename: file.name,
                filesize: file.size
            };
            
            this.displayImagePreview(compressedFile, file.name, file.size);
            this.updateSaveButton();
            
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Error processing image. Please try again.');
        }
    }

    static displayImagePreview(file, filename, filesize) {
        Utils.hideElement('imageUploadArea');
        Utils.showElement('imagePreview');
        
        const previewImage = document.getElementById('previewImage');
        const fileNameSpan = document.getElementById('imageFileName');
        const fileSizeSpan = document.getElementById('imageFileSize');
        
        if (previewImage) previewImage.src = URL.createObjectURL(file);
        if (fileNameSpan) fileNameSpan.textContent = filename;
        if (fileSizeSpan) fileSizeSpan.textContent = Utils.formatFileSize(filesize);
    }

    static updateWordCount() {
        const textArea = document.getElementById('answerText');
        const wordCount = document.getElementById('wordCount');
        const wordLimit = document.getElementById('wordLimit');
        
        if (!textArea || !wordCount) return;
        
        const words = Utils.countWords(textArea.value);
        const question = examState.examData[examState.currentQuestion];
        const limit = question?.word_limit || 150;
        
        wordCount.textContent = `${words} words`;
        
        const isOverLimit = words > limit;
        wordCount.classList.toggle('over-limit', isOverLimit);
        if (wordLimit) wordLimit.classList.toggle('over-limit', isOverLimit);
    }

    static saveCurrentAnswer() {
        const index = examState.currentQuestion;
        
        if (examState.currentAnswerMode === 'text') {
            const textArea = document.getElementById('answerText');
            if (textArea && textArea.value.trim()) {
                examState.answers[index] = {
                    type: 'text',
                    content: textArea.value.trim(),
                    wordCount: Utils.countWords(textArea.value.trim()),
                    timestamp: new Date().toISOString()
                };
            } else {
                delete examState.answers[index];
            }
        } else {
            const imageData = examState.imageCache[index];
            if (imageData) {
                examState.answers[index] = {
                    type: 'image',
                    file: imageData.file,
                    base64: imageData.base64,
                    filename: imageData.filename,
                    filesize: imageData.filesize,
                    timestamp: new Date().toISOString()
                };
            } else {
                delete examState.answers[index];
            }
        }
        
        this.updateAnswerStatus();
        this.updateNavigation();
    }

    static updateAnswerStatus() {
        const statusIndicator = document.getElementById('statusIndicator');
        if (!statusIndicator) return;
        
        const answer = examState.answers[examState.currentQuestion];
        
        if (answer) {
            const text = answer.type === 'text' ? 
                `Answered (${answer.wordCount} words)` : 
                `Answered (Image: ${answer.filename})`;
            statusIndicator.textContent = text;
            statusIndicator.className = 'status-indicator answered';
        } else {
            statusIndicator.textContent = 'Not answered';
            statusIndicator.className = 'status-indicator not-answered';
        }
    }

    static updateSaveButton() {
        const saveBtn = document.getElementById('saveBtn');
        if (!saveBtn) return;
        
        let hasContent = false;
        
        if (examState.currentAnswerMode === 'text') {
            const textArea = document.getElementById('answerText');
            hasContent = textArea && textArea.value.trim().length > 0;
        } else {
            hasContent = examState.imageCache[examState.currentQuestion] !== undefined;
        }
        
        saveBtn.disabled = !hasContent;
        saveBtn.textContent = hasContent ? 'Save Answer' : 'No Content to Save';
    }

    static updateNavigationButtons(index) {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        const isLastQuestion = index === examState.examData.length - 1;
        
        if (prevBtn) prevBtn.style.display = index === 0 ? 'none' : 'block';
        if (nextBtn) nextBtn.style.display = isLastQuestion ? 'none' : 'block';
        
        if (submitBtn) {
            submitBtn.classList.toggle('hidden', !isLastQuestion);
            submitBtn.style.display = isLastQuestion ? 'block' : 'none';
        }
    }

    static next() {
        if (examState.currentQuestion < examState.examData.length - 1) {
            this.load(examState.currentQuestion + 1);
        }
    }

    static previous() {
        if (examState.currentQuestion > 0) {
            this.load(examState.currentQuestion - 1);
        }
    }
}

// ==================== AI ANALYSIS ENGINE ====================
class AIAnalysisEngine {
    static async analyzeAnswer(question, answer) {
        try {
            const prompt = this.createAnalysisPrompt(question, answer);
            const requestBody = this.buildRequestBody(prompt, answer);

            const response = await fetch(`${API_CONFIG.GEMINI.BASE_URL}${API_CONFIG.GEMINI.MODEL}:generateContent?key=${API_CONFIG.GEMINI.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            const aiResponse = data.candidates[0].content.parts[0].text;
            
            const analysis = this.parseAnalysisResponse(aiResponse);
            
            // Evaluate and potentially improve the model answer
            const modelAnswerEvaluation = await this.evaluateAndImproveModelAnswer(
                question, 
                analysis, 
                question.Solution
            );
            
            // Update the comparison to use the final model answer
            analysis.model_answer_comparison = await this.updateModelAnswerComparison(
                question,
                answer,
                analysis,
                modelAnswerEvaluation.modelAnswer
            );
            
            analysis.model_answer_evaluation = modelAnswerEvaluation;
            
            return analysis;
            
        } catch (error) {
            console.error('AI Analysis Error:', error);
            const defaultAnalysis = this.getDefaultAnalysis(question, answer);
            defaultAnalysis.model_answer_evaluation = {
                isImproved: false,
                modelAnswer: question.Solution,
                reason: "Analysis failed, using original model answer"
            };
            return defaultAnalysis;
        }
    }

    static buildRequestBody(prompt, answer) {
        const parts = answer.type === 'image' ? 
            [
                { text: prompt },
                { 
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: answer.base64
                    }
                }
            ] : 
            [{ text: prompt }];

        return { contents: [{ parts }] };
    }

    static createAnalysisPrompt(question, answer) {
        const isImageAnswer = answer.type === 'image';
        
        return `You are an expert UPSC examiner and educational analyst, using aIQversity's comprehensive multi-level analysis framework, who is very strict in marking and seldom gives zero marks when the provided answer is irrelevant to the question. Analyze this answer comprehensively with a holistic point of view (but relevancy is **paramount**) and provide detailed feedback. Analyze this answer using our 5-tier classification system. Deduct marks if the answer's word limit is crossed by 10 words in the answer.

        CRITICAL INSTRUCTIONS:
        - NO generic responses like "Great effort! Let's refine..."
        - Reference SPECIFIC content from the student's answer
        - Be strict in marking
        - If answer is irrelevant, give low scores or even zero and explain why
        - Analyze at each classification level for comprehensive feedback

        **aIQversity's MULTI-LEVEL CLASSIFICATION ANALYSIS**
        **Subject Level**: ${question.classification.subject}
        **Topic Level**: ${question.classification.topic}
        **SubTopic Level**: ${question.classification.subtopic  || 'General'}
        **Sub-SubTopic Level**: ${question.classification.sub_subtopic || 'General'}
        **Concept Level**: ${question.classification.concept || 'General'}

        **QUESTION METADATA:**
        Marks: ${question.marks} marks
        Word Limit: ${question.word_limit} words
        Difficulty: ${question.difficulty_level}

        **QUESTION:**
        ${question.Question}

        **MODEL ANSWER (for reference):**
        ${question.Solution}

        **ANSWER TO ANALYZE:**
        ${isImageAnswer ? 'The student has provided a handwritten/visual answer. Please analyze the content, structure, presentation, and any diagrams/charts included in the image.' : `Student's Answer: ${answer.content}\nWord Count: ${answer.wordCount} words.`}

        ** aIQversity COMPREHENSIVE ANALYSIS TASK **
        Evaluate the student's answer across all classification levels:
        1. Subject-level understanding of ${question.classification.subject}
        2. Topic-level grasp of ${question.classification.topic}
        3. SubTopic-level knowledge of ${question.classification.subtopic || 'the subtopic'}
        4. Sub-SubTopic-level details about ${question.classification.sub_subtopic || 'specific aspects'}
        5. Concept-level comprehension of ${question.classification.concept || 'the underlying concept'}


        **ANALYSIS REQUIREMENTS:**
        Please provide a comprehensive analysis in the following JSON format:

        {
          "overall_score": <score out of ${question.marks} which should reflect the analysis scores you provide for the content;>,
          "percentage": <percentage score>,
          "content_analysis": {
            "accuracy": <score out of 10>,
            "depth": <score out of 10>,
            "relevance": <score out of 10>,
            "examples_usage": <score out of 10>,
            "comments": "SPECIFIC feedback about what the student wrote about ${question.classification.topic}"
          },
          "structure_analysis": {
            "introduction": <score out of 10>,
            "body_organization": <score out of 10>,
            "conclusion": <score out of 10>,
            "flow": <score out of 10>,
            "comments": "Feedback on answer structure, logical flow, and organization"
          },
          "presentation_analysis": {
            "language_quality": <score out of 10>,
            "clarity": <score out of 10>,
            "grammar": <score out of 10>,
            "visual_elements": <score out of 10>,
            "comments": "Assessment of language usage, clarity, and presentation quality"
          },
          "upsc_specific": {
            "word_limit_adherence": <score out of 10>,
            "question_interpretation": <score out of 10>,
            "upsc_style": <score out of 10>,
            "practical_application": <score out of 10>,
            "comments": "Evaluation based on UPSC marking standards and requirements"
          },
          "strengths": [
            "List 3-5 specific strengths observed in the answer with "
          ],
          "improvement_areas": [
            "List 3-5 specific areas needing improvement"
          ],
          "specific_suggestions": [
            "Provide 3-5 actionable suggestions for improvement"
          ],
          "model_answer_comparison": "Compare with model answer and highlight key differences",
          "grade_explanation": "Detailed explanation of why this specific score was awarded (out of ${question.marks} marks)",
          "next_steps": "Specific recommendations for the student's continued improvement in this topic"
        }

        **IMPORTANT GUIDELINES:**
        - Be constructive and encouraging while honest about weaknesses
        - Focus on UPSC-specific evaluation criteria which is very strict - only toppers achieve 60% marks which is very rare; do not hesitate to award zero marks
        - Consider visual elements like diagrams, flowcharts, maps if present in image
        - Evaluate handwriting legibility and presentation if it's an image answer
        - Provide specific, actionable feedback
        - Compare with the provided model answer - however the model answer might also not be good enough
        - Consider the difficulty level and marking scheme
        - Be thorough but concise in your analysis
        - Evaluate the answer for non-repetitiveness and deduct marks if the same information is provided in different ways in different parts of the answer
        - See that the question is not re-written in the answer in different words

        aIQversity VALIDATION CHECKLIST:
        ✓ Did I analyze understanding at each classification level?
        ✓ Did I reference specific content from the student's answer?
        ✓ Did I avoid generic phrases and provide targeted feedback?
        ✓ Are my suggestions specific to their demonstrated knowledge gaps?
        ✓ Did I explain scores based on actual answer content across all levels?

        Provide **ONLY** the JSON response, no additional text.`;
    }

    static parseAnalysisResponse(aiResponse) {
        try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in response');
            }
        } catch (error) {
            console.error('Error parsing AI analysis:', error);
            return this.getDefaultAnalysis();
        }
    }
    static async evaluateAndImproveModelAnswer(question, studentAnalysis, originalModelAnswer) {
        try {
            const prompt = `You are an expert UPSC examiner. Analyze if the provided model answer needs improvement based on the feedback given to a student's answer.

    **QUESTION:**
    ${question.Question}

    **ORIGINAL MODEL ANSWER:**
    ${originalModelAnswer}

    **STUDENT ANALYSIS RESULTS:**
    - Content Score: ${studentAnalysis.content_analysis.accuracy}/10
    - Structure Score: ${studentAnalysis.structure_analysis.body_organization}/10
    - Key Feedback: ${studentAnalysis.content_analysis.comments}
    - Improvement Areas: ${studentAnalysis.improvement_areas.slice(0, 3).join(', ')}

    **EVALUATION TASK:**
    Compare the original model answer with the standards reflected in the student feedback. If the model answer doesn't meet the high standards reflected in your analysis criteria, generate an improved version.

    Respond in JSON format:
    {
      "needs_improvement": <true/false>,
      "evaluation_reason": "Brief explanation of why the model answer needs or doesn't need improvement",
      "improved_answer": "<improved model answer if needs_improvement is true, otherwise null>"
    }

    **GUIDELINES:**
    - Only suggest improvement if the model answer significantly lacks depth, examples, structure, or UPSC standards
    - The improved answer should demonstrate the excellence expected for full marks
    - Include specific examples, proper structure, and comprehensive coverage
    - Word limit: ${question.word_limit} words`;

            const response = await this.makeAPICall(prompt);
            const evaluation = this.parseJSONResponse(response);
            
            if (evaluation && evaluation.needs_improvement && evaluation.improved_answer) {
                return {
                    isImproved: true,
                    modelAnswer: evaluation.improved_answer,
                    reason: evaluation.evaluation_reason
                };
            } else {
                return {
                    isImproved: false,
                    modelAnswer: originalModelAnswer,
                    reason: evaluation?.evaluation_reason || "Original model answer meets the required standards"
                };
            }
            
        } catch (error) {
            console.error('Model answer evaluation error:', error);
            return {
                isImproved: false,
                modelAnswer: originalModelAnswer,
                reason: "Evaluation failed, using original model answer"
            };
        }
    }
    static async updateModelAnswerComparison(question, answer, analysis, finalModelAnswer) {
        try {
            const prompt = `Compare the student's answer with the final model answer and provide insights.

    **QUESTION:** ${question.Question}

    **STUDENT'S ANSWER:** ${answer.type === 'image' ? 'The student has provided a handwritten/visual answer. Analyze the visible content, structure, and presentation.' : answer.content}

    **FINAL MODEL ANSWER:** ${finalModelAnswer}

    **ORIGINAL ANALYSIS:** ${analysis.model_answer_comparison}

    Provide an updated comparison focusing on key differences between the student answer and this final model answer. Keep it concise and actionable (2-3 sentences max).`;

            // Use the same request body building logic as the main analysis
            const requestBody = this.buildRequestBody(prompt, answer);

            const response = await fetch(`${API_CONFIG.GEMINI.BASE_URL}${API_CONFIG.GEMINI.MODEL}:generateContent?key=${API_CONFIG.GEMINI.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            return data.candidates[0].content.parts[0].text.trim();
            
        } catch (error) {
            console.error('Comparison update error:', error);
            return analysis.model_answer_comparison; // fallback to original
        }
    }


    static getDefaultAnalysis(question, answer) {
        return {
            overall_score: 6,
            percentage: 60,
            content_analysis: {
                accuracy: 6, depth: 6, relevance: 7, examples_usage: 5,
                comments: "Analysis unavailable. Please check your internet connection and try again."
            },
            structure_analysis: {
                introduction: 6, body_organization: 6, conclusion: 6, flow: 6,
                comments: "Unable to analyze structure at this time."
            },
            presentation_analysis: {
                language_quality: 6, clarity: 6, grammar: 6, 
                visual_elements: answer?.type === 'image' ? 7 : 5,
                comments: "Presentation analysis unavailable."
            },
            upsc_specific: {
                word_limit_adherence: answer?.wordCount <= (question?.word_limit || 150) ? 8 : 4,
                question_interpretation: 6, upsc_style: 6, practical_application: 5,
                comments: "UPSC-specific analysis unavailable."
            },
            strengths: ["Answer was submitted successfully", "Shows engagement with the question"],
            improvement_areas: ["Analysis system temporarily unavailable", "Please try again later for detailed feedback"],
            specific_suggestions: ["Ensure stable internet connection", "Try refreshing and resubmitting"],
            model_answer_comparison: "Comparison unavailable at this time.",
            grade_explanation: `This is a default score due to analysis system being temporarily unavailable. Question worth ${question?.marks || 10} marks.`,
            next_steps: "Please retry the analysis or contact support if the issue persists.",
            // ADD THIS LINE:
            model_answer_evaluation: {
                isImproved: false,
                modelAnswer: question?.Solution || "Model answer unavailable",
                reason: "Default analysis, using original model answer"
            }
        };
    }

    static async generateEncouragement(question, questionIndex) {
        try {
            const prompt = `You are a supportive UPSC mentor. A student has not attempted this question:

Question: ${question.Question}
Subject: ${question.classification.subject}
Topic: ${question.classification.topic}
Marks: ${question.marks}
Word Limit: ${question.word_limit}

Generate encouraging content in JSON format:
{
  "title": "A compelling, encouraging title (under 60 characters)",
  "message": "A supportive message explaining why attempting this question is valuable (under 150 characters)"
}

Be motivational, specific to UPSC preparation, and emphasize the learning opportunity. Use encouraging language that inspires action.`;

            const response = await this.makeAPICall(prompt);
            this.updateEncouragementElements(response, questionIndex);
            
        } catch (error) {
            console.error('Encouragement generation error:', error);
            this.setDefaultEncouragement(questionIndex);
        }
    }

    static async generateResultsTitle(results) {
        try {
            const prompt = `You are a UPSC performance analyst. Generate a personalized, engaging title for this student's performance results:

Performance Summary:
- Overall Score: ${results.overall_percentage}%
- Questions Answered: ${results.answered_questions}/${results.total_questions}
- Duration: ${Math.floor(results.duration / 60)} minutes

Generate a title in JSON format:
{
  "title": "An engaging, personalized title (under 60 characters) that reflects their performance level"
}

Examples of good titles:
- "Excellent Progress in Your UPSC Journey!" (for high scores)
- "Strong Foundation Built - Room to Excel!" (for average scores)
- "Learning Opportunity - Every Step Counts!" (for lower scores)
- "Every journey has a start" (for zero score) - never use "Great effort! Let's refine your answer and boost your score next time." if the answer was completely irrelevant


Make it encouraging and specific to their performance level.`;

            const response = await this.makeAPICall(prompt);
            return this.parseJSONResponse(response)?.title || this.getDefaultTitle(results);
            
        } catch (error) {
            console.error('Title generation error:', error);
            return this.getDefaultTitle(results);
        }
    }

    static async generateFeedbackHeader(question, analysis) {
        try {
            const prompt = `You are a strict UPSC examiner. Generate a specific feedback header based on the student's actual performance:
            Question: ${question.Question}
            Subject: ${question.classification.subject}
            Score: ${analysis.overall_score}/${question.marks} (${analysis.percentage}%)
            Content Comments: ${analysis.content_analysis.comments}
            Generate feedback in JSON format:
            {
              "message": "A specific feedback message (under 80 characters) based on their actual answer performance"
            }
            CRITICAL: Reference their specific answer content, NOT generic encouragement. Be specific about what they did right/wrong.`;
            const response = await this.makeAPICall(prompt);
            return this.parseJSONResponse(response)?.message || this.getDefaultFeedbackHeader(analysis);
        } catch (error) {
            console.error('Feedback header generation error:', error);
            return this.getDefaultFeedbackHeader(analysis);
        }
    }

    static async makeAPICall(prompt) {
        const response = await fetch(`${API_CONFIG.GEMINI.BASE_URL}${API_CONFIG.GEMINI.MODEL}:generateContent?key=${API_CONFIG.GEMINI.API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    static parseJSONResponse(response) {
        try {            
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                let jsonStr = jsonMatch[0].trim();
                
                // Remove code block markers if present
                jsonStr = jsonStr.replace(/```json\s*/, '').replace(/```\s*$/, '');
                
                // PROPER newline handling - replace with spaces or remove entirely
                // This preserves the JSON structure while removing formatting newlines
                jsonStr = jsonStr.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
                
                // Clean up multiple spaces
                jsonStr = jsonStr.replace(/\s+/g, ' ');
                
                // Handle other control characters (but NOT newlines since we already handled them)
                jsonStr = jsonStr.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
                
                return JSON.parse(jsonStr);
            } else {
                console.warn('No JSON found in response');
                throw new Error('No valid JSON found in response');
            }
        } catch (error) {
            console.error('Error parsing AI analysis:', error);
            console.error('Failed on string:', response.substring(0, 1000) + '...');
            return this.getDefaultAnalysis();
        }
    }

    static updateEncouragementElements(response, questionIndex) {
        const encouragement = this.parseJSONResponse(response);
        const titleElement = document.getElementById(`encouragement-title-${questionIndex}`);
        const textElement = document.getElementById(`encouragement-text-${questionIndex}`);
        
        if (titleElement && encouragement?.title) titleElement.textContent = encouragement.title;
        if (textElement && encouragement?.message) textElement.textContent = encouragement.message;
        
        if (!encouragement) this.setDefaultEncouragement(questionIndex);
    }

    static setDefaultEncouragement(questionIndex) {
        const titleElement = document.getElementById(`encouragement-title-${questionIndex}`);
        const textElement = document.getElementById(`encouragement-text-${questionIndex}`);
        
        if (titleElement) titleElement.textContent = "Don't let this question go unanswered!";
        if (textElement) textElement.textContent = "Every question is an opportunity to learn and improve. Even a partial answer shows your thinking process and can earn valuable marks.";
    }

    static getDefaultTitle(results) {
        const percentage = results.overall_percentage;
        if (percentage >= 80) return "Outstanding Performance - Keep Excelling!";
        if (percentage >= 60) return "Strong Progress in Your UPSC Preparation!";
        if (percentage >= 40) return "Good Foundation - Ready to Improve!";
        return "Learning Journey - Every Step Matters!";
    }

    static getDefaultFeedbackHeader(analysis) {
        const percentage = analysis.percentage;
        if (percentage >= 80) return "Excellent work! Your understanding shines through.";
        if (percentage >= 60) return "Good effort! You're on the right track.";
        return "Great attempt! Every question is a learning opportunity.";
    }
}

// ==================== RESULTS CALCULATOR ====================
class ResultsCalculator {
    static async calculate(progressCallback = null) {
        const basicStats = this.calculateBasicStats();
        const analytics = await this.calculateAnalytics(progressCallback);
        const results = this.buildResultsObject(basicStats, analytics);
        DataManager.storeResults(results);
        return results;
    }

    static async calculateAnalytics(progressCallback = null) {
        const analytics = {
            subjectStats: {},
            topicStats: {},
            difficultyStats: {},
            bloomsStats: {},
            conceptStats: {},
            skillAverages: { content: [], structure: [], presentation: [], upsc_specific: [] }
        };

        const totalQuestions = examState.examData.length;
        
        for (let index = 0; index < examState.examData.length; index++) {
            const question = examState.examData[index];
            const answer = examState.answers[index];

            if (progressCallback) {
                const currentTask = answer ? 
                    `Analyzing Question ${index + 1}: ${question.classification.subject}, ${question.classification.concept}` :
                    `Processing Question ${index + 1}: No answer provided`;
                progressCallback(index, totalQuestions, currentTask);
            }
            
            const analysis = answer ? 
                await AIAnalysisEngine.analyzeAnswer(question, answer) : 
                this.getUnansweredAnalysis(question);
            
            examState.analysisResults[index] = analysis;
            
            this.updateStatistics(analytics, question, analysis);
            if (progressCallback) {
                progressCallback(index + 1, totalQuestions, `Completed Question ${index + 1}`);
            }
        }

        if (progressCallback) {
            progressCallback(totalQuestions, totalQuestions, 'Calculating overall insights...');
        }
        
        this.calculateSkillAverages(analytics);
        
        const totalScore = Object.values(examState.analysisResults)
            .reduce((sum, analysis) => sum + analysis.overall_score, 0);
        
        return { ...analytics, totalScore };
    }

    static calculateBasicStats() {
        let answered = 0, totalMaxScore = 0;
        
        examState.examData.forEach((question, index) => {
            totalMaxScore += question.marks;
            if (examState.answers[index]) answered++;
        });
        
        return { 
            answered, 
            unanswered: examState.examData.length - answered, 
            totalScore: 0, 
            totalMaxScore 
        };
    }

    static updateStatistics(analytics, question, analysis) {
        const categories = [
            { stats: analytics.subjectStats, key: question.classification.subject },
            { stats: analytics.topicStats, key: question.classification.topic },
            { stats: analytics.difficultyStats, key: question.difficulty_level },
            { stats: analytics.bloomsStats, key: question.blooms_taxonomy },
            { stats: analytics.conceptStats, key: question.classification.concept || 'General Concept' }
        ];

        categories.forEach(({ stats, key }) => {
            this.updateStatCategory(stats, key, analysis.overall_score, question.marks);
        });

        // Update skill averages
        analytics.skillAverages.content.push(analysis.content_analysis.accuracy);
        analytics.skillAverages.structure.push(analysis.structure_analysis.body_organization);
        analytics.skillAverages.presentation.push(analysis.presentation_analysis.clarity);
        analytics.skillAverages.upsc_specific.push(analysis.upsc_specific.upsc_style);
    }

    static updateStatCategory(statsObject, category, score, maxMarks) {
        if (!category) category = 'General';
        
        if (!statsObject[category]) {
            statsObject[category] = {
                total_marks: 0, scored_marks: 0, 
                question_count: 0, answered_count: 0
            };
        }
        
        const stats = statsObject[category];
        stats.total_marks += maxMarks;
        stats.scored_marks += score;
        stats.question_count += 1;
        
        if (score > 0) stats.answered_count += 1;
    }

    static calculateSkillAverages(analytics) {
        Object.keys(analytics.skillAverages).forEach(skill => {
            const scores = analytics.skillAverages[skill];
            analytics.skillAverages[skill] = scores.length > 0 ? 
                Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        });
    }

    static getUnansweredAnalysis(question) {
        return {
            overall_score: 0, percentage: 0,
            content_analysis: { accuracy: 0, depth: 0, relevance: 0, examples_usage: 0, comments: "Question not attempted." },
            structure_analysis: { introduction: 0, body_organization: 0, conclusion: 0, flow: 0, comments: "No structure to evaluate as question was not attempted." },
            presentation_analysis: { language_quality: 0, clarity: 0, grammar: 0, visual_elements: 0, comments: "No presentation to evaluate as question was not attempted." },
            upsc_specific: { word_limit_adherence: 0, question_interpretation: 0, upsc_style: 0, practical_application: 0, comments: "UPSC requirements not met as question was not attempted." },
            strengths: ["Question was available for attempt"],
            improvement_areas: ["Attempt the question", "Plan time management to cover all questions", "Practice writing under time constraints"],
            specific_suggestions: ["Allocate time for each question before starting", "Even a partial answer is better than no answer", "Practice speed writing while maintaining quality"],
            model_answer_comparison: "No comparison possible as question was not attempted.",
            grade_explanation: `Score: 0/${question.marks}. Question was not attempted, resulting in zero marks.`,
            next_steps: "Focus on time management and attempt all questions in future practice sessions."
        };
    }

    static buildResultsObject(basicStats, analytics) {
        const totalMaxScore = examState.examData.reduce((sum, q) => sum + q.marks, 0);
        const overallPercentage = totalMaxScore > 0 ? 
            Math.round((analytics.totalScore / totalMaxScore) * 100) : 0;
        
        return {
            overall_percentage: overallPercentage,
            total_score: analytics.totalScore,
            total_max_score: totalMaxScore,
            answered_questions: basicStats.answered,
            unanswered_questions: basicStats.unanswered,
            total_questions: examState.examData.length,
            subject_stats: analytics.subjectStats,
            topic_stats: analytics.topicStats,
            difficulty_stats: analytics.difficultyStats,
            blooms_stats: analytics.bloomsStats,
            concept_stats: analytics.conceptStats,
            skill_averages: analytics.skillAverages,
            question_analyses: examState.analysisResults,
            answers: examState.answers,
            duration: examState.examDuration,
            timestamp: new Date().toISOString()
        };
    }
}

// ==================== RESULTS DISPLAY ====================
class ResultsDisplay {
    static async show() {
        const results = DataManager.getResults();
        if (!results) return;
        
        AppController.hideAnalysisLoading();
        Utils.switchInterface(SELECTORS.LOADING, SELECTORS.RESULTS_INTERFACE);
        
        await this.displayResultsHeader(results);
        this.displayQuickStats(results);
        this.displayQuestionAnalysis(results);
        this.displayCharts(results);
        await this.generateOverallInsights(results);
        
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }

    static async displayResultsHeader(results) {
        const elements = {
            title: document.getElementById('resultsTitle'),
            subtitle: document.getElementById('resultsSubtitle'),
            overallScore: document.getElementById('overallScore'),
            scoreProgress: document.getElementById('overallScoreProgress')
        };
        
        if (elements.title) {
            elements.title.textContent = 'Analyzing Your Performance...';
            const aiTitle = await AIAnalysisEngine.generateResultsTitle(results);
            elements.title.textContent = aiTitle;
        }
        
        if (elements.subtitle) {
            elements.subtitle.textContent = `${results.answered_questions}/${results.total_questions} questions attempted • ${results.total_score}/${results.total_max_score} marks secured • ${Utils.formatTime(results.duration)} total time`;
        }
        
        if (elements.overallScore && elements.scoreProgress) {
            const percentage = results.overall_percentage;
            const circumference = 2 * Math.PI * 50;
            const offset = circumference - (percentage / 100) * circumference;
            
            setTimeout(() => {
                elements.scoreProgress.style.strokeDashoffset = offset;
                Utils.animateCounter(elements.overallScore, 0, percentage, '%');
            }, 500);
        }
    }

    static displayQuickStats(results) {
        const elements = {
            answeredCount: document.getElementById('answeredCount'),
            averageScore: document.getElementById('averageScore'),
            strongAreas: document.getElementById('strongAreas'),
            improvementAreas: document.getElementById('improvementAreas')
        };

        if (elements.answeredCount) {
            Utils.animateCounter(elements.answeredCount, 0, results.answered_questions);
        }
        
        if (elements.averageScore) {
            Utils.animateCounter(elements.averageScore, 0, results.overall_percentage, '%');
        }
        
        const skillScores = Object.values(results.skill_averages);
        const strongAreas = skillScores.filter(score => score >= 7).length;
        const improvementAreas = skillScores.filter(score => score < 6).length;
        
        if (elements.strongAreas) Utils.animateCounter(elements.strongAreas, 0, strongAreas);
        if (elements.improvementAreas) Utils.animateCounter(elements.improvementAreas, 0, improvementAreas);
    }

    static displayQuestionAnalysis(results) {
        const container = document.getElementById('questionAnalysisContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.entries(results.question_analyses).forEach(([index, analysis]) => {
            const question = examState.examData[parseInt(index)];
            const answer = results.answers[index];
            
            const card = document.createElement('div');
            card.className = 'question-analysis-card';
            card.id = `question-card-${index}`;
            card.innerHTML = this.createQuestionAnalysisHTML(question, answer, analysis, parseInt(index) + 1);
            
            container.appendChild(card);
            
            if (!answer) {
                AIAnalysisEngine.generateEncouragement(question, parseInt(index));
            } else {
                AIAnalysisEngine.generateFeedbackHeader(question, analysis).then(message => {
                    const headerElement = document.getElementById(`feedback-header-${parseInt(index)}`);
                    if (headerElement) headerElement.textContent = `📋 ${message}`;
                    
                    if (!examState.feedbackMessages) examState.feedbackMessages = {};
                    examState.feedbackMessages[parseInt(index)] = message;
                });
            }
        });
    }

    static createQuestionAnalysisHTML(question, answer, analysis, questionNum) {
        if (!answer) {
            return this.createUnansweredQuestionHTML(question, questionNum);
        }
        
        const scoreClass = analysis.percentage >= 70 ? 'excellent' : 
                          analysis.percentage >= 50 ? 'good' : 'needs-improvement';
        
        return `
            <div class="question-card-header">
                <div class="question-info">
                    <h3>Question ${questionNum}</h3>
                    <span class="subject-tag">${question.classification.subject}</span>
                </div>
                <div class="score-display ${scoreClass}">
                    <span class="score">${analysis.overall_score}/${question.marks}</span>
                    <span class="percentage">${analysis.percentage}%</span>
                </div>
            </div>
            
            <div class="question-text-preview">
                ${question.Question}
            </div>
            
            <div class="answer-type-indicator">
                <span class="answer-type ${answer.type}">
                    ${answer.type === 'text' ? 
                        `📝 Text Answer (${answer.wordCount} words)` : 
                        `🖼️ Image Answer (${answer.filename})`
                    }
                </span>
            </div>

            <div class="feedback-header-section">
                <p id="feedback-header-${questionNum - 1}" class="feedback-header-text">📋 Analyzing your response...</p>
            </div>
            
            <div class="skills-breakdown">
                ${this.createSkillBreakdownHTML(analysis)}
            </div>
            
            <div class="key-feedback">
                <div class="strengths">
                    <h4>Key Strengths</h4>
                    <div class="feedback-points">
                        ${analysis.strengths.slice(0, 2).map(strength => `
                            <div class="feedback-point">
                                <span class="point-bullet">-</span>
                                <span>${strength}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="improvements">
                    <h4>Quick Wins</h4>
                    <div class="feedback-points">
                        ${analysis.improvement_areas.slice(0, 2).map(area => `
                            <div class="feedback-point">
                                <span class="point-bullet">-</span>
                                <span>${area}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <button class="view-detailed-btn" onclick="toggleDetailedAnalysis(${questionNum - 1})">
                <span class="btn-text">📋 View Detailed Feedback</span>
            </button>
            
            <div class="detailed-analysis-container" id="detailed-analysis-${questionNum - 1}" style="display: none;">
                <div class="detailed-analysis-content">
                    ${ReviewManager.createDetailedReviewHTML(question, answer, analysis, questionNum)}
                </div>
            </div>
        `;
    }

    static createUnansweredQuestionHTML(question, questionNum) {
        return `
            <div class="question-card-header">
                <div class="question-info">
                    <h3>Question ${questionNum}</h3>
                    <span class="subject-tag">${question.classification.subject}</span>
                </div>
                <div class="score-display not-attempted">
                    <span class="score">0/${question.marks}</span>
                    <span class="percentage">Not Attempted</span>
                </div>
            </div>
            
            <div class="question-text-preview">
                ${question.Question}
            </div>
            
            <div class="answer-type-indicator">
                <span class="answer-type not-attempted">
                    ❌ Not Attempted
                </span>
            </div>
            
            <div class="encouragement-message">
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 1.2em;">💡</span>
                        <strong style="color: #856404;" id="encouragement-title-${questionNum - 1}">Loading...</strong>
                    </div>
                    <p style="color: #856404; margin: 0; font-size: 0.9em;" id="encouragement-text-${questionNum - 1}">
                        Loading...
                    </p>
                </div>
            </div>
            
            <button class="view-detailed-btn" onclick="toggleDetailedAnalysis(${questionNum - 1})">
                <span class="btn-text">📖 View Model Answer</span>
            </button>
            
            <div class="detailed-analysis-container" id="detailed-analysis-${questionNum - 1}" style="display: none;">
                <div class="detailed-analysis-content">
                    ${ReviewManager.createDetailedReviewHTML(question, null, null, questionNum)}
                </div>
            </div>
        `;
    }

    static createSkillBreakdownHTML(analysis) {
        const skills = [
            { name: 'Content', score: analysis.content_analysis.accuracy },
            { name: 'Structure', score: analysis.structure_analysis.body_organization },
            { name: 'Presentation', score: analysis.presentation_analysis.clarity }
        ];

        return skills.map(skill => `
            <div class="skill-item">
                <span>${skill.name}</span>
                <div class="skill-bar">
                    <div class="skill-progress" style="width: ${skill.score * 10}%"></div>
                </div>
                <span>${skill.score}/10</span>
            </div>
        `).join('');
    }

    static displayCharts(results) {
        this.createSubjectChart(results.subject_stats);
        this.createSkillChart(results.skill_averages);
    }

    static createSubjectChart(subjectStats) {
        const ctx = document.getElementById('subjectChart');
        if (!ctx) return;
        
        if (examState.charts.subjectChart) {
            examState.charts.subjectChart.destroy();
        }
        
        const subjects = Object.keys(subjectStats);
        const percentages = subjects.map(subject => {
            const stats = subjectStats[subject];
            return Math.round((stats.scored_marks / stats.total_marks) * 100);
        });
        
        examState.charts.subjectChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: subjects,
                datasets: [{
                    label: 'Performance (%)',
                    data: percentages,
                    backgroundColor: subjects.map((_, i) => {
                        const colors = ['#F7A621', '#10B981', '#6366f1', '#EF4444', '#8B5CF6'];
                        return colors[i % colors.length];
                    }),
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: value => value + '%' }
                    }
                }
            }
        });
    }

    static createSkillChart(skillAverages) {
        const ctx = document.getElementById('skillChart');
        if (!ctx) return;
        
        if (examState.charts.skillChart) {
            examState.charts.skillChart.destroy();
        }
        
        const skills = Object.keys(skillAverages);
        const scores = Object.values(skillAverages);
        
        examState.charts.skillChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: skills.map(skill => skill.replace('_', ' ').toUpperCase()),
                datasets: [{
                    label: 'Skill Level',
                    data: scores,
                    backgroundColor: 'rgba(247, 166, 33, 0.2)',
                    borderColor: '#F7A621',
                    borderWidth: 2,
                    pointBackgroundColor: '#F7A621',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#F7A621'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10,
                        ticks: { display: false },
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    }
                }
            }
        });
    }

    static async generateOverallInsights(results) {
        try {
            const insights = await this.generateAIInsights(results);
            this.displayInsights(insights);
        } catch (error) {
            console.error('Error generating insights:', error);
            this.displayInsights(this.getDefaultInsights(results));
        }
    }

    static async generateAIInsights(results) {
        const prompt = `Analyze this UPSC student's overall performance and provide insights:

Overall Score: ${results.overall_percentage}%
Questions Answered: ${results.answered_questions}/${results.total_questions}
Subject Performance: ${JSON.stringify(results.subject_stats)}
Skill Averages: ${JSON.stringify(results.skill_averages)}

Provide response in JSON format:
{
  "performance_overview": "2-3 sentences about overall performance",
  "key_strengths": ["3 specific strengths"],
  "growth_recommendations": ["3 specific actionable recommendations"]
}`;

        const response = await AIAnalysisEngine.makeAPICall(prompt);
        return AIAnalysisEngine.parseJSONResponse(response) || this.getDefaultInsights(results);
    }

    static getDefaultInsights(results) {
        return {
            performance_overview: `You've demonstrated good engagement by answering ${results.answered_questions} questions with an overall score of ${results.overall_percentage}%. Your performance shows areas of strength while identifying opportunities for targeted improvement.`,
            key_strengths: [
                "Consistent attempt at answering questions across different topics",
                "Shows understanding of UPSC question patterns and requirements",
                "Demonstrates ability to structure responses appropriately"
            ],
            growth_recommendations: [
                "Focus on enhancing content depth with more relevant examples and case studies",
                "Practice improving answer structure with clearer introductions and conclusions",
                "Work on presentation skills including handwriting clarity and diagram integration"
            ]
        };
    }

    static displayInsights(insights) {
        const elements = {
            performanceOverview: document.getElementById('performanceOverview'),
            keyStrengths: document.getElementById('keyStrengths'),
            growthRecommendations: document.getElementById('growthRecommendations')
        };
        
        if (elements.performanceOverview) {
            elements.performanceOverview.innerHTML = `<p>${insights.performance_overview}</p>`;
        }
        
        if (elements.keyStrengths) {
            elements.keyStrengths.innerHTML = `
                <ul>
                    ${insights.key_strengths.map(strength => `<li>${strength}</li>`).join('')}
                </ul>
            `;
        }
        
        if (elements.growthRecommendations) {
            elements.growthRecommendations.innerHTML = `
                <ul>
                    ${insights.growth_recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            `;
        }
    }
}

// ==================== REVIEW MANAGER ====================
class ReviewManager {
    static show() {
        Utils.switchInterface(SELECTORS.RESULTS_INTERFACE, SELECTORS.REVIEW_INTERFACE);
        this.generateDetailedReview();
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }

    static generateDetailedReview() {
        const results = DataManager.getResults();
        const reviewContainer = document.getElementById('reviewContainer');
        if (!reviewContainer || !results) return;
        
        reviewContainer.innerHTML = '';

        Object.entries(results.question_analyses).forEach(([index, analysis]) => {
            const question = examState.examData[parseInt(index)];
            const answer = results.answers[index];
            
            const reviewDiv = document.createElement('div');
            reviewDiv.className = 'detailed-review-card';
            reviewDiv.innerHTML = this.createDetailedReviewHTML(question, answer, analysis, parseInt(index) + 1);
            
            reviewContainer.appendChild(reviewDiv);
        });
    }

    static createDetailedReviewHTML(question, answer, analysis, questionNum) {
        if (!answer) {
            return this.createUnansweredReviewHTML(question);
        }

        return `
            <div class="modern-analysis-container">
                <div class="analysis-header-compact">
                    <div class="question-preview">
                        <h4 id="feedback-header-${questionNum - 1}">📋 Analyzing your response...</h4>
                        <div class="meta-tags">
                            <span class="tag subject">${question.classification.subject}</span>
                            <span class="tag marks">${question.marks} marks</span>
                            <span class="tag words">${question.word_limit} words</span>
                        </div>
                    </div>
                    <div class="score-visual">
                        <div class="circular-progress" data-percentage="${analysis.percentage}">
                            <div class="progress-inner">
                                <span class="score-big">${analysis.overall_score}</span>
                                <span class="score-total">/${question.marks}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="analysis-tabs">
                    <div class="tab-buttons">
                        <button class="tab-btn active" data-tab="scores">📊 Scores</button>
                        <button class="tab-btn" data-tab="feedback">💬 Feedback</button>
                        <button class="tab-btn" data-tab="comparison">🔄 Comparison</button>
                    </div>

                    ${this.createScoresTabHTML(analysis)}
                    ${this.createFeedbackTabHTML(analysis)}
                    ${this.createComparisonTabHTML(question, analysis)}
                </div>
            </div>
        `;
    }

    static createUnansweredReviewHTML(question) {
        return `
            <div class="unanswered-question-analysis">
                <div style="background: linear-gradient(135deg, #e3f2fd, #f3e5f5); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <span style="font-size: 2em;">📚</span>
                        <h4 style="color: #1565c0; margin: 10px 0;">Learn from the Model Answer</h4>
                        <p style="color: #424242; font-size: 0.9em; margin: 0;">
                            Since you didn't attempt this question, here's how an ideal answer should look:
                        </p>
                    </div>
                </div>

                <div class="model-answer-section">
                    <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h5 style="color: #28a745; margin-bottom: 15px;">📖 Model Answer</h5>
                        <div style="line-height: 1.6; color: #2d3748;">
                            ${question.Solution}
                        </div>
                    </div>
                </div>

                ${question.tips_and_tricks ? `
                <div class="tips-section">
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h5 style="color: #856404; margin-bottom: 15px;">💡 Key Tips for This Question</h5>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${question.tips_and_tricks.map(tip => `<li style="margin-bottom: 8px; color: #856404;">${tip}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}

                <div class="encouragement-section">
                    <div style="background: linear-gradient(135deg, #e8f5e8, #f0f9ff); border: 1px solid #10b981; border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="font-size: 1.5em; margin-bottom: 10px;">🎯</div>
                        <h5 style="color: #047857; margin-bottom: 10px;">Ready to Try?</h5>
                        <p style="color: #047857; margin: 0; font-size: 0.9em;">
                            Use this model answer as a guide to structure your own response. Remember, practice makes perfect!
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    static createScoresTabHTML(analysis) {
        const scoreCards = [
            { 
                name: 'Content Quality', icon: '', 
                score: analysis.content_analysis.accuracy,
                details: [
                    { name: 'Accuracy', score: analysis.content_analysis.accuracy },
                    { name: 'Depth', score: analysis.content_analysis.depth }
                ]
            },
            { 
                name: 'Structure', icon: '', 
                score: analysis.structure_analysis.body_organization,
                details: [
                    { name: 'Organization', score: analysis.structure_analysis.body_organization },
                    { name: 'Flow', score: analysis.structure_analysis.flow }
                ]
            },
            { 
                name: 'Presentation', icon: '', 
                score: analysis.presentation_analysis.clarity,
                details: [
                    { name: 'Clarity', score: analysis.presentation_analysis.clarity },
                    { name: 'Language', score: analysis.presentation_analysis.language_quality }
                ]
            },
            { 
                name: 'UPSC Style', icon: '', 
                score: analysis.upsc_specific.upsc_style,
                details: [
                    { name: 'Word Limit', score: analysis.upsc_specific.word_limit_adherence },
                    { name: 'Style', score: analysis.upsc_specific.upsc_style }
                ]
            }
        ];

        return `
            <div class="tab-content active" id="scores">
                <div class="scores-grid">
                    ${scoreCards.map(card => `
                        <div class="score-card ${card.name.toLowerCase().replace(' ', '-')}">
                            <div class="score-header">
                                <span class="icon">${card.icon}</span>
                                <h5>${card.name}</h5>
                                <span class="score">${card.score}/10</span>
                            </div>
                            <div class="score-details">
                                ${card.details.map(detail => `
                                    <div class="detail-row">
                                        <span>${detail.name}</span>
                                        <div class="mini-bar">
                                            <div class="fill" style="width: ${detail.score * 10}%"></div>
                                        </div>
                                        <span>${detail.score}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    static createFeedbackTabHTML(analysis) {
        return `
            <div class="tab-content" id="feedback">
                <div class="feedback-grid">
                    <div class="feedback-card suggestions full-width">
                        <h5>Detailed Insights & Recommendations</h5>
                        <div class="suggestions-list">
                            ${analysis.specific_suggestions.slice(0, 6).map(suggestion => `
                                <div class="suggestion-item">
                                    <span class="suggestion-bullet">▶</span>
                                    <span>${suggestion}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="feedback-card strengths">
                        <h5>What Worked Well</h5>
                        <div class="suggestions-list">
                            ${analysis.strengths.slice(2, 5).map(strength => `
                                <div class="suggestion-item">
                                    <span class="suggestion-bullet">▶</span>
                                    <span>${strength}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="feedback-card improvements">
                        <h5>Advanced Improvements</h5>
                        <div class="suggestions-list">
                            ${analysis.improvement_areas.slice(2, 5).map(area => `
                                <div class="suggestion-item">
                                    <span class="suggestion-bullet">▶</span>
                                    <span>${area}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static createComparisonTabHTML(question, analysis) {
        const modelAnswer = analysis.model_answer_evaluation?.modelAnswer
        
        return `
            <div class="tab-content" id="comparison">
                <div class="comparison-section">
                    <h5>Reference Model Answer</h5>
                    <div class="model-answer-preview">
                        ${modelAnswer}
                    </div>
                    <div class="comparison-insight">
                        <h6>Key Differences</h6>
                        <p>${analysis.model_answer_comparison}</p>
                    </div>
                    <div class="next-steps">
                        <h6>Next Steps</h6>
                        <p>${analysis.next_steps}</p>
                    </div>
                </div>
            </div>
        `;
    }

    static backToResults() {
        Utils.switchInterface(SELECTORS.REVIEW_INTERFACE, SELECTORS.RESULTS_INTERFACE);
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
}

// ==================== EMAIL VERIFICATION ====================
class EmailVerification {
    static initialize() {
        this.setupEventListeners();
    }

    static setupEventListeners() {
        const verifyButton = document.getElementById('verifyButton');
        const closeModalBtn = document.getElementById('closeModal');
        const modalOverlay = document.getElementById('modalOverlay');
        
        if (verifyButton) verifyButton.addEventListener('click', this.verify.bind(this));
        if (closeModalBtn) closeModalBtn.addEventListener('click', this.hideRegistrationModal);
        if (modalOverlay) modalOverlay.addEventListener('click', this.hideRegistrationModal);
    }

    static showVerificationModal() {
        const modal = document.getElementById('emailVerificationModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    static hideVerificationModal() {
        const modal = document.getElementById('emailVerificationModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
        
        this.resetForm('verificationForm');
        this.hideVerificationError();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    static async verify(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('verifyEmail');
        const email = emailInput?.value;
        
        if (!email) {
            this.showVerificationError('Please enter an email address');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showVerificationError('Please enter a valid email address');
            return;
        }
        
        this.showVerificationLoading(true);
        this.hideVerificationError();
        
        try {
            const result = await this.makeFormRequest(API_CONFIG.EMAIL.SCRIPT_URL, {
                action: 'verify',
                email: email
            });
            
            if (result.success && result.data && result.data.accessGranted) {
                sessionStorage.setItem('examAccessVerified', 'true');
                sessionStorage.setItem('verifiedEmail', email);
                
                this.hideVerificationModal();
                ExamInterface.show();
                
            } else {
                this.showVerificationError(result.message || 'Email not found. Please register first.');
            }
            
        } catch (error) {
            console.error('Verification error:', error);
            this.showVerificationError(error.message);
        } finally {
            this.showVerificationLoading(false);
        }
    }
    static async makeFormRequest(url, data) {
        try {
            const formData = new URLSearchParams();
            Object.keys(data).forEach(key => {
                formData.append(key, data[key]);
            });
            
            const response = await fetch(url, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const textResult = await response.text();
            return JSON.parse(textResult);
            
        } catch (error) {
            console.error('Form request failed:', error);
            throw error;
        }
    }

    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static showVerificationLoading(show) {
        const loading = document.getElementById('verificationLoading');
        const button = document.getElementById('verifyButton');
        
        if (!loading || !button) return;
        
        if (show) {
            loading.classList.remove('hidden');
            button.textContent = 'Setting up...';
            button.disabled = true;
        } else {
            loading.classList.add('hidden');
            button.textContent = '🚀 Start Practice Session';
            button.disabled = false;
        }
    }

    static showVerificationError(message) {
        const errorDiv = document.getElementById('verificationError');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    static hideVerificationError() {
        const errorDiv = document.getElementById('verificationError');
        if (errorDiv) errorDiv.classList.add('hidden');
    }

    static showRegistrationModal() {
        const modal = document.getElementById('registrationModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    static hideRegistrationModal() {
        const modal = document.getElementById('registrationModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
        
        this.resetForm('registrationForm');
        
        const success = document.getElementById('registrationSuccess');
        if (success) success.classList.add('hidden');
        
        const form = document.getElementById('registrationForm');
        if (form) form.style.display = 'block';
    }

    static async submitRegistration(event) {
        event.preventDefault();
        
        const form = document.getElementById('registrationForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const data = { action: 'register' };
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Validate required fields
        const email = formData.get('email');
        const name = formData.get('name');
        const userType = formData.get('user_type');
        
        if (!email || !name || !userType) {
            alert('Please fill in all required fields.');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        
        const submitButton = form.querySelector('button[type="submit"]');
        if (!submitButton) return;
        
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Registering...';
        submitButton.disabled = true;
        
        try {
            const result = await this.makeFormRequest(API_CONFIG.EMAIL.SCRIPT_URL, data);
            
            if (result.success) {
                form.style.display = 'none';
                const success = document.getElementById('registrationSuccess');
                if (success) success.classList.remove('hidden');
                
                sessionStorage.setItem('examAccessVerified', 'true');
                sessionStorage.setItem('verifiedEmail', email);
            } else {
                alert('Registration failed: ' + result.message);
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            alert('Connection error. Please try again.');
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    static proceedToExam() {
        this.hideRegistrationModal();
        setTimeout(() => ExamInterface.show(), 100);
    }

    static resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();
    }
}

// ==================== EXAM INTERFACE ====================
class ExamInterface {
    static async show() {
        const heroSection = document.querySelector('.text-center.mb-12 h1, .text-center h1[class*="text-"]');
        const testSection = heroSection ? heroSection.closest('.container.mx-auto') : null;
        const isEmailVerificationFlow = testSection && testSection.style.display !== 'none';
        
        if (isEmailVerificationFlow) {
            this.hideHeroSection(testSection);
            this.showExamContainer();
            await AppController.initialize();
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
        } else {
            Utils.switchInterface(SELECTORS.LOADING, SELECTORS.EXAM_INTERFACE);
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
        }
    }

    static hideHeroSection(testSection) {
        testSection.style.display = 'none';
    }

    static showExamContainer() {
        const examContainer = document.getElementById('examContainer');
        if (examContainer) {
            examContainer.className = 'container';
            examContainer.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; width: 100% !important; max-width: 100% !important;';
        }
        
        Utils.hideElement('loading');
        Utils.showElement('examInterface');
    }
}

// ==================== MAIN APP CONTROLLER ====================
class AppController {
    static async initialize() {
        try {
            await DataManager.loadExamData();
            this.setupNavigation();
            this.setupEventListeners();
            ExamInterface.show();
        } catch (error) {
            Utils.handleError('Failed to initialize practice session', error);
        }
    }

    static setupNavigation() {
        QuestionManager.createNavigation();
        QuestionManager.setupAnswerModeHandlers();
        QuestionManager.load(0);
    }

    static setupEventListeners() {
        this.setupScrollToTop();
    }

    static setupScrollToTop() {
        const scrollToTopButton = document.getElementById('scrollToTop');
        if (!scrollToTopButton) return;
        
        window.onscroll = function() {
            const isVisible = document.body.scrollTop > 20 || document.documentElement.scrollTop > 20;
            scrollToTopButton.classList.toggle('hidden', !isVisible);
        };

        scrollToTopButton.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    static async submitExam() {
        QuestionManager.saveCurrentAnswer();
        
        if (Object.keys(examState.answers).length < examState.examData.length) {
            if (!confirm('You have not answered all questions. Are you sure you want to submit?')) {
                return;
            }
        }
        
        TimerManager.stop();
        this.showAnalysisLoading();
        
        try {
            const results = await ResultsCalculator.calculate(this.updateAnalysisProgress.bind(this));
            ResultsDisplay.show();
        } catch (error) {
            console.error('Error calculating results:', error);
            this.hideAnalysisLoading();
            alert('Error analyzing answers. Please try again.');
            Utils.switchInterface(SELECTORS.LOADING, SELECTORS.EXAM_INTERFACE);
        }
    }

    static updateAnalysisProgress(current, total, currentTask) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill && progressText) {
            const percentage = Math.round((current / total) * 100);
            progressFill.style.width = percentage + '%';
            progressText.textContent = currentTask || `Analyzing question ${current} of ${total}...`;
        }
    }   

    static showAnalysisLoading() {
        Utils.switchInterface(SELECTORS.EXAM_INTERFACE, SELECTORS.LOADING);
        this.updateLoadingContent();
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }

    static updateLoadingContent() {
        const elements = {
            loadingTitle: document.getElementById('loadingTitle'),
            loadingSubtitle: document.getElementById('loadingSubtitle'),
            progressText: document.getElementById('progressText'),
            progressFill: document.getElementById('progressFill')
        };
        
        if (elements.loadingTitle) elements.loadingTitle.textContent = 'Analyzing Your Answers';
        if (elements.loadingSubtitle) elements.loadingSubtitle.textContent = 'You’re getting tailored feedback from aIQversity to support your learning journey!';
        if (elements.progressText) elements.progressText.textContent = 'Starting analysis...';
        if (elements.progressFill) elements.progressFill.style.width = '0%';
    }

    static hideAnalysisLoading() {
        const elements = {
            loadingTitle: document.getElementById('loadingTitle'),
            loadingSubtitle: document.getElementById('loadingSubtitle'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText')
        };
        
        if (elements.loadingTitle) elements.loadingTitle.textContent = 'Loading Practice Session...';
        if (elements.loadingSubtitle) elements.loadingSubtitle.textContent = 'Please wait while we prepare your subjective questions.';
        if (elements.progressFill) elements.progressFill.style.width = '0%';
        if (elements.progressText) elements.progressText.textContent = 'Initializing...';
    }

    static restartExam() {
        
        examState.clearTimer();
        DataManager.clearAllData();
        examState.reset();
        TimerManager.hideTimer();
        
        Utils.switchInterface(SELECTORS.RESULTS_INTERFACE, SELECTORS.LOADING);
        this.resetLoadingScreen();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(async () => {
            try {
                await this.initializeFreshExam();
            } catch (error) {
                console.error('Error during restart:', error);
                Utils.handleError('Failed to restart exam', error);
            }
        }, 1000);
    }

    static resetLoadingScreen() {
        const elements = {
            loadingTitle: document.getElementById('loadingTitle'),
            loadingSubtitle: document.getElementById('loadingSubtitle'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText')
        };
        
        if (elements.loadingTitle) elements.loadingTitle.textContent = 'Loading Practice Session...';
        if (elements.loadingSubtitle) elements.loadingSubtitle.textContent = 'Please wait while we prepare your subjective questions.';
        if (elements.progressFill) elements.progressFill.style.width = '0%';
        if (elements.progressText) elements.progressText.textContent = 'Initializing...';
    }

    static async initializeFreshExam() {
        this.resetUIElements();
        await DataManager.loadExamData();
        this.setupNavigation();
        this.setupEventListeners();
        
        Utils.switchInterface(SELECTORS.LOADING, SELECTORS.EXAM_INTERFACE);
        
        const startButton = document.getElementById('startTestButton');
        if (startButton && startButton.parentElement) {
            startButton.parentElement.style.display = 'block';
        }
        
        this.hideExamElements();
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }

    static resetUIElements() {
        const elements = {
            questionList: document.getElementById('questionList'),
            questionText: document.getElementById('questionText'),
            answerText: document.getElementById('answerText'),
            wordCount: document.getElementById('wordCount'),
            imageUploadArea: document.getElementById('imageUploadArea'),
            imagePreview: document.getElementById('imagePreview'),
            imageUpload: document.getElementById('imageUpload')
        };
        
        if (elements.questionList) elements.questionList.innerHTML = '';
        if (elements.questionText) elements.questionText.innerHTML = '';
        if (elements.answerText) elements.answerText.value = '';
        if (elements.wordCount) elements.wordCount.textContent = '0 words';
        if (elements.imageUploadArea) elements.imageUploadArea.classList.remove('hidden');
        if (elements.imagePreview) elements.imagePreview.classList.add('hidden');
        if (elements.imageUpload) elements.imageUpload.value = '';
        
        // COMPLETELY RESET IMAGE UPLOAD AREA TO REMOVE ALL EVENT LISTENERS
        const imageSection = document.getElementById('imageAnswerSection');
        if (imageSection) {
            imageSection.innerHTML = `
                <div class="image-upload-area" id="imageUploadArea">
                    <div class="upload-instructions">
                        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7,10 12,15 17,10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <h3>Upload Your Answer</h3>
                        <p>Drag and drop an image file here, or click to browse</p>
                        <p class="upload-note">Supports: JPG, PNG, GIF (Max 5MB)</p>
                    </div>
                    <input type="file" id="imageUpload" accept="image/*" style="display: none;">
                </div>
                
                <!-- Image Preview -->
                <div class="image-preview hidden" id="imagePreview">
                    <div class="preview-header">
                        <h4>Answer Preview:</h4>
                        <button type="button" class="remove-image-btn" onclick="removeImage()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <img id="previewImage" alt="Answer preview">
                    <div class="image-info">
                        <span id="imageFileName"></span>
                        <span id="imageFileSize"></span>
                    </div>
                </div>
            `;
        }
        
        const textRadio = document.querySelector('input[value="text"]');
        if (textRadio) textRadio.checked = true;
    }

    static hideExamElements() {
        Utils.hideElement('questionList');
        Utils.hideElement('questionCard');
        Utils.hideElement('examNavigation');
    }
}

// ==================== GLOBAL FUNCTION BINDINGS ====================
const GlobalFunctions = {
    nextQuestion: () => QuestionManager.next(),
    previousQuestion: () => QuestionManager.previous(),
    saveCurrentAnswer: () => {
        QuestionManager.saveCurrentAnswer();
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.textContent = 'Saved!';
            setTimeout(() => saveBtn.textContent = 'Save Answer', 2000);
        }
    },
    submitExam: () => AppController.submitExam(),
    showDetailedReview: () => ReviewManager.show(),
    toggleDetailedAnalysis: (questionIndex) => {
        const question = examState.examData[questionIndex];
        const results = DataManager.getResults();
        const answer = results?.answers[questionIndex];
        const analysis = results?.question_analyses[questionIndex];
        
        if (!question || !analysis) return;
        
        let modal = document.getElementById('feedbackModal');
        if (!modal) {
            modal = GlobalFunctions.createFeedbackModal();
        }
        
        GlobalFunctions.updateModalContent(modal, question, answer, analysis, questionIndex);
        GlobalFunctions.showModal(modal);
    },
    createFeedbackModal: () => {
        const modal = document.createElement('div');
        modal.id = 'feedbackModal';
        modal.className = 'feedback-modal';
        modal.innerHTML = `
            <div class="feedback-modal-content">
                <div class="feedback-modal-header">
                    <h3 class="feedback-modal-title">Detailed Feedback</h3>
                    <button class="feedback-modal-close" onclick="closeFeedbackModal()">&times;</button>
                </div>
                <div class="feedback-modal-body" id="feedbackModalBody">
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) GlobalFunctions.closeFeedbackModal();
        });
        
        return modal;
    },
    updateModalContent: (modal, question, answer, analysis, questionIndex) => {
        const modalBody = document.getElementById('feedbackModalBody');
        const modalTitle = modal.querySelector('.feedback-modal-title');
        
        modalTitle.textContent = `Detailed Feedback - Question ${questionIndex + 1}`;
        modalBody.innerHTML = ReviewManager.createDetailedReviewHTML(question, answer, analysis, questionIndex + 1);
        
        if (answer) {
            const storedMessage = examState.feedbackMessages?.[questionIndex];
            if (storedMessage) {
                const modalHeaderElement = modalBody.querySelector(`#feedback-header-${questionIndex}`);
                if (modalHeaderElement) {
                    modalHeaderElement.textContent = `📋 ${storedMessage}`;
                }
            } else {
                AIAnalysisEngine.generateFeedbackHeader(question, analysis).then(message => {
                    const modalHeaderElement = modalBody.querySelector(`#feedback-header-${questionIndex}`);
                    if (modalHeaderElement) {
                        modalHeaderElement.textContent = `📋 ${message}`;
                    }
                });
            }
        }
    },
    showModal: (modal) => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    closeFeedbackModal: () => {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    },
    backToResults: () => ReviewManager.backToResults(),
    restartExam: () => AppController.restartExam(),
    initiateExamAccess: () => EmailVerification.showVerificationModal(),
    hideEmailVerificationModal: () => EmailVerification.hideVerificationModal(),
    showRegistrationFromError: () => {
        EmailVerification.hideVerificationModal();
        EmailVerification.showRegistrationModal();
    },
    showRegistrationModal: () => EmailVerification.showRegistrationModal(),
    hideRegistrationModal: () => EmailVerification.hideRegistrationModal(),
    submitRegistrationForm: (event) => EmailVerification.submitRegistration(event),
    proceedToExamAfterRegistration: () => EmailVerification.proceedToExam(),
    clearTextAnswer: () => {
        const textArea = document.getElementById('answerText');
        if (textArea) {
            textArea.value = '';
            QuestionManager.updateWordCount();
            QuestionManager.updateSaveButton();
        }
    },
    removeImage: () => {
        Utils.showElement('imageUploadArea');
        Utils.hideElement('imagePreview');
        
        const fileInput = document.getElementById('imageUpload');
        if (fileInput) fileInput.value = '';
        
        delete examState.imageCache[examState.currentQuestion];
        QuestionManager.updateSaveButton();
    },
    startExamTest: function() {
        const startButton = document.getElementById('startTestButton');
        if (startButton && startButton.parentElement) {
            startButton.parentElement.style.display = 'none';
        }
        
        Utils.showElement('questionList');
        Utils.showElement('questionCard');
        Utils.showElement('examNavigation');
        
        TimerManager.initialize();
        QuestionManager.load(0);
        
        setTimeout(() => {
            const questionCard = document.getElementById('questionCard');
            if (questionCard) {
                questionCard.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 100);
    }
};

// Bind all global functions to window
Object.assign(window, GlobalFunctions);

// ==================== EVENT LISTENERS ====================
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('tab-btn')) {
        const tabContainer = e.target.closest('.analysis-tabs');
        const targetTab = e.target.getAttribute('data-tab');
        
        tabContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        e.target.classList.add('active');
        tabContainer.querySelector(`#${targetTab}`).classList.add('active');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.circular-progress').forEach(circle => {
        const percentage = circle.getAttribute('data-percentage');
        circle.style.setProperty('--percentage', percentage);
    });
    
    EmailVerification.initialize();
});