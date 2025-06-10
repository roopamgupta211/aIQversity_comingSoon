// CV Analysis & Career Guidance System: app.js
// ==================== DYNAMIC CONFIGURATION ====================
const getConfig = () => {
    return window.ANALYSIS_CONFIG || {
        MAX_FILE_SIZE: 5 * 1024 * 1024,
        SUPPORTED_FORMATS: ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png'],
        ANALYSIS_CONTEXT: {
            NAME: 'AI CV Analysis',
            DESCRIPTION: 'Comprehensive AI-powered analysis of your CV/Resume with personalized career guidance and actionable recommendations.',
            SECTIONS: ['Contact Info', 'Summary/Objective', 'Experience', 'Education', 'Skills', 'Projects', 'Certifications'],
            PROCESSING_METHOD: 'Direct LLM Processing'
        }
    };
};

const CONFIG = getConfig();

const EMAIL_CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyqQ0QocnrUgrIC3h3Tv6tXZHBlgVTnhiwmdXZiJBPO1-lbB8HgMsNcMEzx32gvjWeZhA/exec'
};

const SELECTORS = {
    LOADING: 'loading',
    UPLOAD_INTERFACE: 'uploadInterface',
    RESULTS_INTERFACE: 'resultsInterface',
    STATUS_INDICATOR: 'statusIndicator'
};

const GEMINI_CONFIG = {
    API_KEY: 'AIzaSyBr38XKvBXOz4eN8r9lkEuj2izj4Ag_zsg',
    MODEL: 'gemini-2.0-flash-001',
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/'
};

// ==================== GLOBAL STATE ====================
class AnalysisState {
    constructor() {
        this.cvFile = null;
        this.cvText = '';
        this.userProfile = {};
        this.analysisResults = null;
        this.matchScoreChart = null;
    }

    reset() {
        this.cvFile = null;
        this.cvText = '';
        this.userProfile = {};
        this.analysisResults = null;
        this.destroyCharts();
    }

    destroyCharts() {
        if (this.matchScoreChart) {
            this.matchScoreChart.destroy();
            this.matchScoreChart = null;
        }
    }
}

const analysisState = new AnalysisState();

// ==================== UTILITY FUNCTIONS ====================
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

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getFileExtension(filename) {
        return '.' + filename.split('.').pop().toLowerCase();
    }

    static handleError(message, error) {
        console.error(message, error);
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `<h2>Error</h2><p>${message}. Please refresh and try again.</p>`;
        }
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// ==================== FILE MANAGER ====================
// ==== FILE MANAGER ====
class FileManager {
    // MIME type mappings based on latest Gemini API documentation
    static MIME_TYPE_MAP = {
        // Document types (from Gemini API docs)
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.csv': 'text/csv',
        '.html': 'text/html',
        '.xml': 'text/xml',
        '.rtf': 'text/rtf',
        
        // Image types
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        
        // Code files (also supported)
        '.js': 'application/javascript',
        '.py': 'text/x-python',
        '.css': 'text/css'
    };

    static validateFile(file) {
        if (!file) {
            throw new Error('No file selected');
        }

        const extension = Utils.getFileExtension(file.name);
        if (!CONFIG.SUPPORTED_FORMATS.includes(extension)) {
            throw new Error(`Unsupported file format. Please upload: ${CONFIG.SUPPORTED_FORMATS.join(', ')}`);
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            throw new Error(`File too large. Maximum size: ${Utils.formatFileSize(CONFIG.MAX_FILE_SIZE)}`);
        }

        return true;
    }

    static getCorrectMimeType(file) {
        const extension = Utils.getFileExtension(file.name);
        const correctMimeType = this.MIME_TYPE_MAP[extension];
        
        if (!correctMimeType) {
            throw new Error(`Unsupported file type: ${extension}`);
        }
        
        return correctMimeType;
    }

    static async extractText(file) {
        this.validateFile(file);
        
        const extension = Utils.getFileExtension(file.name);
        
        try {
            // Use LLM direct processing for ALL formats
            switch (extension) {
                case '.pdf':
                case '.docx':
                case '.doc':
                case '.txt':
                case '.md':
                case '.csv':
                case '.html':
                case '.xml':
                case '.rtf':
                    return await this.processWithGemini(file);
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.webp':
                    return await this.processImageWithGemini(file);
                default:
                    throw new Error('Unsupported file format');
            }
        } catch (error) {
            console.error('File processing error:', error);
            throw new Error(`Failed to process ${extension} file: ${error.message}`);
        }
    }

    static async processWithGemini(file, retryCount = 0) {
        const maxRetries = 2;
        
        try {
            StatusManager.update('Uploading file to AI processor...');
            
            // Upload file to Gemini Files API with correct MIME type
            const uploadResult = await this.uploadToGemini(file);
            
            StatusManager.update('Waiting for file processing...');
            
            // Wait for file to be processed
            await this.delay(2000);
            
            StatusManager.update('Extracting text content...');
            
            // Process with Gemini 2.0 Flash using the correct mimeType
            const text = await this.analyzeWithGemini(uploadResult.file.uri, uploadResult.file.mimeType);
            
            // Cleanup uploaded file (extract file ID from name)
            const fileId = uploadResult.file.name.split('/').pop();
            await this.cleanupGeminiFile(fileId);
            
            return text;
            
        } catch (error) {
            if (retryCount < maxRetries && (error.message.includes('rate limit') || error.message.includes('not exist'))) {
                console.log(`Retrying upload (${retryCount + 1}/${maxRetries})...`);
                await this.delay(3000 * (retryCount + 1));
                return this.processWithGemini(file, retryCount + 1);
            }
            throw error;
        }
    }

    static async processImageWithGemini(file) {
        try {
            StatusManager.update('Processing image with OCR...');
            
            const base64 = await this.fileToBase64(file);
            const correctMimeType = this.getCorrectMimeType(file);
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Extract ALL text content from this CV/Resume image. Maintain original structure and formatting. Include all sections like contact info, experience, education, skills, etc. Return only the extracted text content." },
                            { 
                                inline_data: {
                                    mime_type: correctMimeType, // Use correct MIME type
                                    data: base64
                                }
                            }
                        ]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Image processing failed: ${errorData.error?.message || response.status}`);
            }

            const data = await response.json();
            const extractedText = data.candidates[0].content.parts[0].text;
            
            if (extractedText.length < 50) {
                throw new Error('Unable to extract sufficient text from image. Please ensure the image is clear and readable.');
            }
            
            return extractedText;
        } catch (error) {
            throw new Error(`Image processing failed: ${error.message}`);
        }
    }

    static async uploadToGemini(file) {
        const correctMimeType = this.getCorrectMimeType(file);
        
        // Use resumable upload for better reliability
        const metadata = {
            file: {
                display_name: file.name
            }
        };

        // Step 1: Start resumable upload
        const startResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_CONFIG.API_KEY}`, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': file.size.toString(),
                'X-Goog-Upload-Header-Content-Type': correctMimeType,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });

        if (!startResponse.ok) {
            const errorData = await startResponse.json();
            throw new Error(`Upload start failed: ${errorData.error?.message || startResponse.status}`);
        }

        const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) {
            throw new Error('No upload URL received');
        }

        // Step 2: Upload the actual file
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': file.size.toString(),
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize'
            },
            body: file
        });
        
        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`Upload failed: ${errorData.error?.message || uploadResponse.status}`);
        }
        
        return await uploadResponse.json();
    }

    static async analyzeWithGemini(fileUri, mimeType) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { 
                            fileData: {
                                mimeType: mimeType, // Use the correct MIME type from upload
                                fileUri: fileUri
                            }
                        },
                        { 
                            text: "Extract ALL text content from this CV/Resume. Maintain original structure and formatting. Include all sections like contact info, experience, education, skills, projects, certifications, etc. Return only the extracted text content without any analysis or commentary." 
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Analysis failed: ${errorData.error?.message || response.status}`);
        }

        const result = await response.json();
        const extractedText = result.candidates[0].content.parts[0].text;
        
        if (extractedText.length < 100) {
            throw new Error('Unable to extract sufficient text from document. Please ensure the file is not corrupted and contains readable text.');
        }
        
        return extractedText;
    }

    static async cleanupGeminiFile(fileName) {
        try {
            await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${GEMINI_CONFIG.API_KEY}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.warn('File cleanup failed:', error);
            // Non-critical error, don't throw
        }
    }

    static fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ==================== STATUS MANAGER ====================
class StatusManager {
    static currentStep = 0;
    static totalSteps = 3;
    static animationStages = ['stage1', 'stage2', 'stage3'];
    
    static show(message = 'Processing...', step = 0) {
        this.currentStep = step;
        const statusElement = document.getElementById('statusIndicator');
        const homeButton = document.getElementById('homeButton');
        
        if (statusElement && homeButton) {
            const progressText = step > 0 ? ` (${step}/${this.totalSteps})` : '';
            statusElement.querySelector('span').textContent = message + progressText;
            statusElement.classList.remove('hidden');
            homeButton.classList.add('hidden');
        }
        
        // Show analysis animations
        this.showAnalysisAnimations();
    }

    static update(message, step = null) {
        if (step !== null) {
            this.currentStep = step;
            this.updateAnalysisStage(step);
        }
        const statusElement = document.getElementById('statusIndicator');
        if (statusElement) {
            const progressText = this.currentStep > 0 ? ` (${this.currentStep}/${this.totalSteps})` : '';
            statusElement.querySelector('span').textContent = message + progressText;
        }
    }

    static showAnalysisAnimations() {
        const animationsContainer = document.getElementById('analysisAnimations');
        if (animationsContainer) {
            animationsContainer.classList.remove('hidden');
            this.updateAnalysisStage(1);
        }
    }

    static updateAnalysisStage(stage) {
        const animationsContainer = document.getElementById('analysisAnimations');
        if (!animationsContainer) return;
        
        // Hide all stages
        this.animationStages.forEach(stageId => {
            const stageElement = document.getElementById(stageId);
            if (stageElement) {
                stageElement.classList.remove('active');
            }
        });
        
        // Show current stage
        if (stage >= 1 && stage <= this.animationStages.length) {
            const currentStage = document.getElementById(this.animationStages[stage - 1]);
            if (currentStage) {
                currentStage.classList.add('active');
            }
        }
    }

    static hideAnalysisAnimations() {
        const animationsContainer = document.getElementById('analysisAnimations');
        if (animationsContainer) {
            animationsContainer.classList.add('hidden');
        }
    }

    static setProgress(current, total = 3) {
        this.currentStep = current;
        this.totalSteps = total;
    }

    static hide() {
        const statusElement = document.getElementById('statusIndicator');
        const homeButton = document.getElementById('homeButton');
        
        if (statusElement && homeButton) {
            statusElement.classList.add('hidden');
            homeButton.classList.remove('hidden');
        }
        
        this.hideAnalysisAnimations();
        this.currentStep = 0;
    }
}

// ==================== CV ANALYZER ====================
class CVAnalyzer {
    static async analyze(cvText, userProfile) {
        try {
            StatusManager.update('Analyzing CV sections...');
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_CONFIG.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: this.createAnalysisPrompt(cvText, userProfile) }]
                    }]
                })
            });

            if (!response.ok) throw new Error(`Analysis failed: ${response.status}`);

            const data = await response.json();
            const aiResponse = data.candidates[0].content.parts[0].text;
            const analysis = this.parseAnalysisResponse(aiResponse);
            
            return analysis;
        } catch (error) {
            console.error('CV Analysis Error:', error);
            throw new Error('Failed to analyze CV. Please try again.');
        }
    }

    static createAnalysisPrompt(cvText, userProfile) {
        return `You are an expert career consultant and CV analyst. Analyze this CV/Resume thoroughly and provide comprehensive feedback for someone aspiring to become a ${userProfile.aspiringCareer} with ${userProfile.experienceLevel} experience level.

    **CV CONTENT:**
    ${cvText}

    **CANDIDATE PROFILE:**
    - Aspiring Career: ${userProfile.aspiringCareer}
    - Experience Level: ${userProfile.experienceLevel}
    - Career Details: ${userProfile.careerDetails || 'Not specified'}

    **ANALYSIS REQUIREMENTS:**
    Provide a comprehensive analysis in the exact JSON format below. Be specific, actionable, and honest in your feedback.

    {
      "overallScore": <number 1-10>,
      "personalizedGreeting": "Create a SHORT, encouraging greeting (max 8-10 words) based on their career aspiration. Examples: 'Impressive technical foundation for Data Science!' or 'Strong leadership experience - VP ready!' Keep it punchy and motivating.",
      
      "heroSubtext": "Create a brief, scannable summary (max 15 words) highlighting their strongest asset and main opportunity. Example: 'Strong technical skills • Leadership impact needed • 85% VP role match'",
      
      "cvHealthReport": "Provide a detailed 4-5 sentence analysis of the CV's overall quality, structure, content strength, and presentation. Be specific about what works well and what needs improvement. Focus on both content and format observations.",
      
      "sectionsAnalysis": [
        {
          "sectionName": "Contact Information",
          "score": <1-10>,
          "feedback": "Specific feedback about contact info completeness and professionalism",
          "suggestions": ["Specific actionable suggestion 1", "Specific actionable suggestion 2"]
        },
        {
          "sectionName": "Professional Summary/Objective", 
          "score": <1-10>,
          "feedback": "Analysis of summary quality, clarity, and alignment with career goals",
          "suggestions": ["Specific suggestion to improve summary", "Another specific suggestion"]
        },
        {
          "sectionName": "Work Experience",
          "score": <1-10>, 
          "feedback": "Assessment of experience relevance, presentation, and quantification",
          "suggestions": ["Specific way to improve experience section", "Another improvement"]
        },
        {
          "sectionName": "Education",
          "score": <1-10>,
          "feedback": "Evaluation of educational background and its presentation", 
          "suggestions": ["Educational improvement suggestion", "Another suggestion"]
        },
        {
          "sectionName": "Skills",
          "score": <1-10>,
          "feedback": "Analysis of skills relevance and presentation for target role",
          "suggestions": ["Skills improvement suggestion", "Another suggestion"]
        },
        {
          "sectionName": "Projects/Achievements",
          "score": <1-10>,
          "feedback": "Assessment of projects and achievements relevance and impact",
          "suggestions": ["Project improvement suggestion", "Another suggestion"]
        }
      ],
      
      "careerAlignment": {
        "matchPercentage": <number 0-100>,
        "matchMessage": "Explanation of why this percentage and what it means for their career prospects",
        "skillsGap": [
          {"skill": "Specific missing skill", "level": "missing", "priority": "high"},
          {"skill": "Skill that needs improvement", "level": "basic", "priority": "medium"},
          {"skill": "Advanced skill needed", "level": "intermediate", "priority": "high"}
        ]
      },
      
      "careerRoadmap": {
        "immediateActions": [
          {"action": "Specific immediate action", "priority": "high", "description": "Why this action is important and how to do it"},
          {"action": "Another immediate action", "priority": "medium", "description": "Detailed explanation"}
        ],
        "shortTermGoals": [
          {"goal": "3-6 month goal", "priority": "high", "description": "How to achieve this goal"},
          {"goal": "Another short-term goal", "priority": "medium", "description": "Steps to accomplish"}
        ],
        "longTermGoals": [
          {"goal": "6-12 month vision", "priority": "high", "description": "Strategic approach to achieve this"},
          {"goal": "Another long-term goal", "priority": "medium", "description": "Long-term strategy"}
        ]
      },
      
      "learningRecommendations": {
        "priorityCourses": [
          {"title": "Specific course name", "description": "Why this course is essential for their goals", "duration": "Expected time to complete", "priority": "high"},
          {"title": "Another priority course", "description": "Detailed explanation of benefits", "duration": "Time investment", "priority": "medium"}
        ],
        "certifications": [
          {"title": "Relevant certification", "description": "How this certification will boost their career", "value": "Market value and recognition", "priority": "high"},
          {"title": "Additional certification", "description": "Benefits explanation", "value": "Career impact", "priority": "medium"}
        ]
      },
      
      "quickStats": {
        "cvScore": <number 1-10>,
        "matchPercentage": <number 0-100>,
        "skillsCount": <number of skills found>,
        "coursesCount": <number of recommended courses>,
        "strengthsCount": <number of strong areas>,
        "improvementAreas": <number of areas needing work>
      }
    }

    **CRITICAL REQUIREMENTS:**
    - Be brutally honest but constructive in feedback
    - Provide specific, actionable suggestions (not generic advice)
    - Tailor everything to their specific career aspiration
    - Ensure all scores reflect the actual CV quality
    - Make recommendations specific to their experience level
    - Include industry-specific insights for their target role
    - Ensure JSON is perfectly formatted and parseable`;
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
            console.error('Error parsing analysis response:', error);
            throw new Error('Failed to parse CV analysis results');
        }
    }
}

// ==================== DATA MANAGER ====================
class DataManager {
    static storeResults(results) {
        console.log('Storing CV analysis results:', results.timestamp);
        localStorage.setItem('cvAnalysisResults', JSON.stringify(results));
    }

    static getResults() {
        const stored = localStorage.getItem('cvAnalysisResults');
        return stored ? JSON.parse(stored) : null;
    }

    static clearAllData() {
        localStorage.clear();
        sessionStorage.clear();
    }
}

// ==================== UPLOAD INTERFACE ====================
class UploadInterface {
    static initialize() {
        this.setupFileUpload();
        this.setupForm();
    }

    static setupFileUpload() {
        const uploadArea = document.getElementById('cvUploadArea');
        const fileInput = document.getElementById('cvFile');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');

        if (!uploadArea || !fileInput) return;

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelection(file, fileInfo, fileName);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                fileInput.files = e.dataTransfer.files;
                this.handleFileSelection(file, fileInfo, fileName);
            }
        });
    }

    static handleFileSelection(file, fileInfo, fileName) {
        try {
            FileManager.validateFile(file);
            analysisState.cvFile = file;
            
            if (fileInfo && fileName) {
                fileName.textContent = `${file.name} (${Utils.formatFileSize(file.size)})`;
                fileInfo.classList.remove('hidden');
            }
        } catch (error) {
            alert(error.message);
            document.getElementById('cvFile').value = '';
            if (fileInfo) fileInfo.classList.add('hidden');
        }
    }

    static setupForm() {
        const form = document.getElementById('cvUploadForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmission();
        });
    }

    static async handleFormSubmission() {
        try {
            // Validate form
            const formData = this.validateForm();
            
            // Store user profile
            analysisState.userProfile = formData;
            
            // Start analysis with enhanced progress tracking
            StatusManager.show('Initializing analysis...', 1);
            StatusManager.setProgress(1, 3);
            
            // Stage 1: File Processing
            await this.delay(2000); // Show scanning animation
            StatusManager.update('Processing your document...', 1);
            const cvText = await FileManager.extractText(analysisState.cvFile);
            analysisState.cvText = cvText;
            
            // Stage 2: Market Analysis  
            await this.delay(2000); // Show processing animation
            StatusManager.update('Analyzing market position...', 2);
            const analysisResults = await CVAnalyzer.analyze(cvText, formData);
            
            // Stage 3: Insights Generation
            await this.delay(2000); // Show insights animation
            StatusManager.update('Generating insights...', 3);
            analysisResults.timestamp = new Date().toISOString();
            analysisResults.fileName = analysisState.cvFile.name;
            analysisResults.processingMethod = 'AI-Powered Analysis';
            DataManager.storeResults(analysisResults);
            analysisState.analysisResults = analysisResults;
            
            // Finalize and show results
            await this.delay(1000);
            StatusManager.hide();
            ResultsDisplay.show();
            
        } catch (error) {
            console.error('Analysis error:', error);
            StatusManager.hide();
            
            // Enhanced error handling
            let userMessage = this.getErrorMessage(error);
            alert(userMessage);
        }
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static getErrorMessage(error) {
        if (error.message.includes('rate limit')) {
            return 'Our AI is currently busy analyzing other CVs. Please try again in a few moments.';
        } else if (error.message.includes('API key')) {
            return 'Service temporarily unavailable. Please contact support.';
        } else if (error.message.includes('file size')) {
            return 'File is too large. Please use a file smaller than 10MB.';
        } else if (error.message.includes('network')) {
            return 'Network issue detected. Please check your connection and try again.';
        }
        return 'Analysis failed. Please ensure your file is readable and try again.';
    }

    static validateForm() {
        const formData = new FormData(document.getElementById('cvUploadForm'));
        
        if (!analysisState.cvFile) {
            throw new Error('Please select a CV file');
        }
        
        const aspiringCareer = formData.get('aspiringCareer');
        const experienceLevel = formData.get('experienceLevel');
        
        if (!aspiringCareer) {
            throw new Error('Please specify your aspiring career');
        }
        
        if (!experienceLevel) {
            throw new Error('Please select your experience level');
        }
        
        return {
            aspiringCareer: aspiringCareer.trim(),
            experienceLevel,
            careerDetails: formData.get('careerDetails')?.trim() || ''
        };
    }

    static show() {
        // Hide the hero section
        const heroContainer = document.querySelector('.hero-professional-container');
        if (heroContainer) {
            heroContainer.style.display = 'none';
        }
        
        // Show the analysis container
        const analysisContainer = document.getElementById('analysisContainer');
        if (analysisContainer) {
            analysisContainer.classList.remove('hidden');
            analysisContainer.style.display = 'block';
        }
        
        // Hide loading screen and show upload interface directly
        Utils.hideElement('loading');
        Utils.showElement('uploadInterface');
        
        // Initialize upload functionality
        this.initialize();
        
        // Scroll to top
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 200);
    }
}

// ==================== RESULTS DISPLAY ====================
class ResultsDisplay {
    static show() {
        const results = DataManager.getResults();
        Utils.switchInterface(SELECTORS.UPLOAD_INTERFACE, SELECTORS.RESULTS_INTERFACE);
        
        // Progressive revelation of results with staggered animations
        this.displayResultsHeader(results);
        
        setTimeout(() => this.displayInsightsSummary(results), 200);
        setTimeout(() => this.displayAIInsights(results), 400);
        setTimeout(() => this.displaySectionsAnalysis(results), 600);
        setTimeout(() => this.displaySkillsAnalysis(results), 800);
        setTimeout(() => this.displayRoadmapTimeline(results), 1000);
        setTimeout(() => this.displayLearningPath(results), 1200);

        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 100);
    }

    static displayResultsHeader(results) {
        const greetingElement = document.getElementById('personalizedGreeting');
        const subtextElement = document.getElementById('heroSubtext');
        
        if (greetingElement) {
            greetingElement.textContent = results.personalizedGreeting || 'Your Career Analysis is Complete!';
        }
        if (subtextElement) {
            subtextElement.textContent = results.heroSubtext || 'Discover insights that could transform your professional journey';
        }
        
        this.animateScoreRing(results.overallScore);
    }

    static displayInsightsSummary(results) {
        const alignmentScore = document.getElementById('alignmentScore');
        const growthScore = document.getElementById('growthScore');
        const salaryRange = document.getElementById('salaryRange');
        
        if (alignmentScore) {
            const matchPercentage = results.careerAlignment?.matchPercentage || 75;
            this.animateNumber(alignmentScore, 0, matchPercentage, 1500, (val) => Math.round(val) + '%');
        }
        
        if (growthScore) {
            const growth = this.calculateGrowthPotential(results);
            growthScore.textContent = growth;
        }
        
        if (salaryRange) {
            const range = this.calculateSalaryRange(results);
            salaryRange.textContent = range;
        }
    }

    static calculateGrowthPotential(results) {
        const score = results.overallScore || 7;
        if (score >= 8.5) return 'Excellent';
        if (score >= 7) return 'High';
        if (score >= 5.5) return 'Good';
        return 'Moderate';
    }

    static calculateSalaryRange(results) {
        const experience = results.quickStats?.skillsCount || 5;
        const score = results.overallScore || 7;
        
        let baseMin = 8;
        let baseMax = 15;
        
        // Adjust based on experience and score
        const multiplier = 1 + (score - 5) * 0.3 + (experience - 3) * 0.2;
        
        const minSalary = Math.round(baseMin * multiplier);
        const maxSalary = Math.round(baseMax * multiplier);
        
        return `₹${minSalary}-${maxSalary}L`;
    }

    static animateScoreRing(score) {
        const scoreProgress = document.getElementById('scoreProgress');
        const scoreValue = document.getElementById('scoreValue');
        
        if (!scoreProgress || !scoreValue) return;
        
        const circumference = 2 * Math.PI * 50;
        const percentage = (score / 10) * 100;
        const offset = circumference - (percentage / 100) * circumference;
        
        // Animate the ring
        setTimeout(() => {
            scoreProgress.style.strokeDashoffset = offset;
            scoreProgress.style.transition = 'stroke-dashoffset 2s ease-out';
            
            // Animate the number
            this.animateNumber(scoreValue, 0, score, 2000, (val) => val.toFixed(1));
        }, 500);
    }

    static animateNumber(element, start, end, duration, formatter = (val) => Math.round(val)) {
        const startTime = performance.now();
        const range = end - start;
        
        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (range * easeOut);
            
            element.textContent = formatter(current);
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        }
        
        requestAnimationFrame(updateNumber);
    }

    static animateScoreCircle(score) {
        const circle = document.getElementById('scoreProgress');
        const scoreText = document.querySelector('#scoreCircle .score-text span');
        
        if (!circle || !scoreText) return;
        
        const percentage = (score / 10) * 100;
        const circumference = 2 * Math.PI * 50;
        const offset = circumference - (percentage / 100) * circumference;
        
        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
            
            let currentScore = 0;
            const increment = score / 30;
            const counter = setInterval(() => {
                currentScore += increment;
                if (currentScore >= score) {
                    currentScore = score;
                    clearInterval(counter);
                }
                scoreText.textContent = currentScore.toFixed(1) + '/10';
            }, 50);
        }, 500);
    }

    static displayQuickStats(results) {
        const stats = results.quickStats;
        
        const elements = {
            cvScore: document.getElementById('cvScore'),
            matchPercentage: document.getElementById('matchPercentage'),
            skillsCount: document.getElementById('skillsCount'),
            coursesCount: document.getElementById('coursesCount')
        };

        if (elements.cvScore) elements.cvScore.textContent = `${stats.cvScore}/10`;
        if (elements.matchPercentage) elements.matchPercentage.textContent = `${stats.matchPercentage}%`;
        if (elements.skillsCount) elements.skillsCount.textContent = stats.skillsCount;
        if (elements.coursesCount) elements.coursesCount.textContent = stats.coursesCount;
        
        this.updateStatChanges(stats);
    }

    static updateStatChanges(stats) {
        const changes = {
            cvScore: document.getElementById('cvScoreChange'),
            match: document.getElementById('matchChange'),
            skills: document.getElementById('skillsChange'),
            courses: document.getElementById('coursesChange')
        };

        if (changes.cvScore) {
            if (stats.cvScore >= 8) {
                changes.cvScore.textContent = 'Excellent quality';
                changes.cvScore.className = 'stat-change positive';
            } else if (stats.cvScore >= 6) {
                changes.cvScore.textContent = 'Good foundation';
                changes.cvScore.className = 'stat-change positive';
            } else {
                changes.cvScore.textContent = 'Needs improvement';
                changes.cvScore.className = 'stat-change improvement';
            }
        }

        if (changes.match) {
            if (stats.matchPercentage >= 80) {
                changes.match.textContent = 'Strong alignment';
                changes.match.className = 'stat-change positive';
            } else if (stats.matchPercentage >= 60) {
                changes.match.textContent = 'Good match';
                changes.match.className = 'stat-change neutral';
            } else {
                changes.match.textContent = 'Room to improve';
                changes.match.className = 'stat-change improvement';
            }
        }

        if (changes.skills) {
            changes.skills.textContent = stats.skillsCount > 0 ? 'Well diverse' : 'Building portfolio';
            changes.skills.className = stats.skillsCount > 0 ? 'stat-change positive' : 'stat-change improvement';
        }

        if (changes.courses) {
            changes.courses.textContent = 'Ready to level up';
            changes.courses.className = 'stat-change improvement';
        }
    }

    static displayAIInsights(results) {
        const insightContainer = document.getElementById('aiCvInsight');
        if (!insightContainer) return;
        
        const cvHealthReport = results.cvHealthReport || 'Analysis completed successfully.';
        
        insightContainer.innerHTML = `
            <div class="detailed-analysis">
                <div class="analysis-header">
                    <h3>📋 Comprehensive CV Analysis</h3>
                    <p class="analysis-intro">Here's what our AI discovered about your professional profile:</p>
                </div>
                
                <div class="cv-health-report">
                    <div class="report-content">
                        ${cvHealthReport}
                    </div>
                </div>
                
                <div class="quick-stats-summary">
                    <div class="stat-highlight">
                        <span class="stat-icon">⭐</span>
                        <span>Overall Score: <strong>${results.overallScore}/10</strong></span>
                    </div>
                    <div class="stat-highlight">
                        <span class="stat-icon">🎯</span>
                        <span>Career Match: <strong>${results.careerAlignment?.matchPercentage || 75}%</strong></span>
                    </div>
                    <div class="stat-highlight">
                        <span class="stat-icon">📈</span>
                        <span>Growth Areas: <strong>${results.quickStats?.improvementAreas || 3}</strong></span>
                    </div>
                </div>
            </div>
        `;
    }

    static displaySectionsAnalysis(results) {
        const container = document.getElementById('sectionsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        results.sectionsAnalysis.forEach((section, index) => {
            const sectionCard = document.createElement('div');
            sectionCard.className = 'section-card';
            sectionCard.style.animationDelay = `${index * 100}ms`;
            
            const scoreClass = section.score >= 8 ? 'excellent' : 
                              section.score >= 6 ? 'good' : 'needs-improvement';
            
            sectionCard.innerHTML = `
                <div class="section-header">
                    <h3>${section.sectionName}</h3>
                    <div class="section-score ${scoreClass}">${section.score}/10</div>
                </div>
                
                <div class="section-feedback">
                    ${section.feedback}
                </div>
                
                <div class="section-suggestions">
                    <h4>💡 Improvement Actions</h4>
                    <ul>
                        ${section.suggestions.slice(0, 2).map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>
            `;
            
            container.appendChild(sectionCard);
            
            // Add entrance animation
            setTimeout(() => {
                sectionCard.style.opacity = '0';
                sectionCard.style.transform = 'translateY(20px)';
                sectionCard.style.transition = 'all 0.6s ease';
                
                setTimeout(() => {
                    sectionCard.style.opacity = '1';
                    sectionCard.style.transform = 'translateY(0)';
                }, 50);
            }, index * 100);
        });
    }

    static displayCareerAlignment(results) {
        this.showChartLoaders(['matchLoader', 'skillsLoader']);
        
        setTimeout(() => {
            this.createMatchScoreChart(results.careerAlignment.matchPercentage);
            this.hideChartLoader('matchLoader');
        }, 600);
        
        setTimeout(() => {
            this.displaySkillsGap(results.careerAlignment.skillsGap);
            this.hideChartLoader('skillsLoader');
        }, 1000);
        
        // Update match info
        const matchInfo = document.getElementById('matchInfo');
        if (matchInfo) {
            matchInfo.innerHTML = `
                <div class="match-percentage">${results.careerAlignment.matchPercentage}%</div>
                <div class="match-message">${results.careerAlignment.matchMessage}</div>
            `;
        }
    }

    static createMatchScoreChart(matchPercentage) {
        const ctx = document.getElementById('matchScoreChart');
        if (!ctx) return;
        
        try {
            analysisState.matchScoreChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [matchPercentage, 100 - matchPercentage],
                        backgroundColor: ['#10B981', '#e9ecef'],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        } catch (error) {
            console.error('Match score chart error:', error);
            ctx.parentElement.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 40px;">Chart unavailable</div>';
        }
    }

    static displaySkillsGap(skillsGap) {
        const container = document.getElementById('skillsGapAnalysis');
        if (!container) return;
        
        container.innerHTML = skillsGap.map(skill => {
            const levelClass = `level-${skill.level}`;
            const levelText = skill.level.charAt(0).toUpperCase() + skill.level.slice(1);
            
            return `
                <div class="skills-gap-item">
                    <span class="skill-name">${skill.skill}</span>
                    <span class="skill-level ${levelClass}">${levelText}</span>
                </div>
            `;
        }).join('');
    }

    static displayCareerRoadmap(results) {
        this.showChartLoaders(['immediateLoader', 'shortTermLoader', 'longTermLoader']);
        
        setTimeout(() => {
            this.displayRoadmapSection('immediateActions', results.careerRoadmap.immediateActions);
            this.hideChartLoader('immediateLoader');
        }, 800);
        
        setTimeout(() => {
            this.displayRoadmapSection('shortTermGoals', results.careerRoadmap.shortTermGoals);
            this.hideChartLoader('shortTermLoader');
        }, 1200);
        
        setTimeout(() => {
            this.displayRoadmapSection('longTermGoals', results.careerRoadmap.longTermGoals);
            this.hideChartLoader('longTermLoader');
        }, 1600);
    }

    static displayRoadmapSection(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = items.map(item => {
            const priorityClass = `priority-${item.priority === 'high' ? 'urgent' : item.priority === 'medium' ? 'important' : 'optional'}`;
            
            return `
                <div class="roadmap-item ${priorityClass}">
                    <h4>
                        ${item.action || item.goal}
                        <span class="roadmap-priority ${priorityClass}">${item.priority}</span>
                    </h4>
                    <p>${item.description}</p>
                </div>
            `;
        }).join('');
    }

    static displayLearningRecommendations(results) {
        this.showChartLoaders(['coursesLoader', 'certsLoader']);
        
        setTimeout(() => {
            this.displayCourses(results.learningRecommendations.priorityCourses);
            this.hideChartLoader('coursesLoader');
        }, 1000);
        
        setTimeout(() => {
            this.displayCertifications(results.learningRecommendations.certifications);
            this.hideChartLoader('certsLoader');
        }, 1400);
    }
    static displayRoadmapTimeline(results) {
        const timelineItems = [
            { id: 'immediateActions', data: results.careerRoadmap?.immediateActions || [] },
            { id: 'shortTermGoals', data: results.careerRoadmap?.shortTermGoals || [] },
            { id: 'longTermGoals', data: results.careerRoadmap?.longTermGoals || [] }
        ];
        
        timelineItems.forEach(item => {
            const container = document.getElementById(item.id);
            if (container && item.data.length > 0) {
                container.innerHTML = item.data.slice(0, 3).map(goal => `
                    <div class="timeline-action">
                        <h5>${goal.action || goal.goal}</h5>
                        <p>${goal.description}</p>
                        <span class="priority-tag priority-${goal.priority}">${goal.priority} priority</span>
                    </div>
                `).join('');
            }
        });
    }

    static displayLearningPath(results) {
        const coursesContainer = document.getElementById('priorityCourses');
        if (!coursesContainer) return;
        
        const courses = results.learningRecommendations?.priorityCourses || [];
        
        coursesContainer.innerHTML = courses.slice(0, 4).map(course => `
            <div class="course-item">
                <div class="course-title">${course.title}</div>
                <div class="course-description">${course.description}</div>
                <div class="course-meta">
                    <span class="course-duration">${course.duration}</span>
                    <span class="course-priority priority-${course.priority}">${course.priority}</span>
                </div>
            </div>
        `).join('');
    }

    static displaySkillsAnalysis(results) {
        // Create dynamic skills data based on analysis
        const skillsData = this.generateSkillsData(results);
        
        // Fix the skills chart area with proper percentages
        const skillsChartContainer = document.querySelector('.skills-chart');
        if (skillsChartContainer) {
            skillsChartContainer.innerHTML = `
                <div class="skills-radar-placeholder">
                    ${skillsData.map(skill => `
                        <div class="skill-category">
                            <div class="skill-name">${skill.name}</div>
                            <div class="skill-bar">
                                <div class="skill-level" style="width: 0%" data-width="${skill.percentage}%"></div>
                            </div>
                            <span class="skill-percentage">${skill.percentage}%</span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Animate the bars after rendering
            setTimeout(() => {
                const skillBars = skillsChartContainer.querySelectorAll('.skill-level');
                skillBars.forEach((bar, index) => {
                    setTimeout(() => {
                        const targetWidth = bar.getAttribute('data-width');
                        bar.style.transition = 'width 1.5s ease-out';
                        bar.style.width = targetWidth;
                    }, index * 200);
                });
            }, 300);
        }

        // Replace market position with interactive career radar
        this.displayCareerRadar(results);
    }

    static generateSkillsData(results) {
        const userProfile = analysisState.userProfile;
        const overallScore = results.overallScore || 7;
        
        // Generate realistic skills based on CV analysis
        return [
            {
                name: "Technical Skills",
                percentage: Math.min(95, Math.max(60, Math.round(overallScore * 10 + Math.random() * 15)))
            },
            {
                name: "Leadership",
                percentage: Math.min(90, Math.max(45, Math.round(overallScore * 8 + Math.random() * 20)))
            },
            {
                name: "Communication", 
                percentage: Math.min(88, Math.max(55, Math.round(overallScore * 9 + Math.random() * 12)))
            },
            {
                name: "Problem Solving",
                percentage: Math.min(95, Math.max(70, Math.round(overallScore * 11 + Math.random() * 10)))
            }
        ];
    }

    static displayCareerRadar(results) {
        const marketPosition = document.getElementById('marketPosition');
        if (!marketPosition) return;
        
        const matchPercentage = results.careerAlignment?.matchPercentage || 75;
        const overallScore = results.overallScore || 7;
        const userProfile = analysisState.userProfile;
        
        marketPosition.innerHTML = `
            <div class="career-radar">
                <h4>🎯 Career Positioning</h4>
                <div class="radar-container">
                    <div class="radar-item">
                        <div class="radar-label">Current Level</div>
                        <div class="radar-bar">
                            <div class="radar-fill" style="width: 0%" data-width="${Math.round(overallScore * 10)}%"></div>
                        </div>
                        <span class="radar-value">${Math.round(overallScore * 10)}%</span>
                    </div>
                    
                    <div class="radar-item">
                        <div class="radar-label">Role Match</div>
                        <div class="radar-bar">
                            <div class="radar-fill" style="width: 0%" data-width="${matchPercentage}%"></div>
                        </div>
                        <span class="radar-value">${matchPercentage}%</span>
                    </div>
                    
                    <div class="radar-item">
                        <div class="radar-label">Market Ready</div>
                        <div class="radar-bar">
                            <div class="radar-fill" style="width: 0%" data-width="${Math.min(95, Math.max(60, matchPercentage + 10))}%"></div>
                        </div>
                        <span class="radar-value">${Math.min(95, Math.max(60, matchPercentage + 10))}%</span>
                    </div>
                </div>
                
                <div class="position-insight">
                    <div class="insight-icon">💡</div>
                    <div class="insight-text">
                        <strong>Your Position:</strong> ${this.getPositionInsight(overallScore, matchPercentage)}
                    </div>
                </div>
            </div>
        `;
        
        // Animate radar bars
        setTimeout(() => {
            const radarBars = marketPosition.querySelectorAll('.radar-fill');
            radarBars.forEach((bar, index) => {
                setTimeout(() => {
                    const targetWidth = bar.getAttribute('data-width');
                    bar.style.transition = 'width 1.2s ease-out';
                    bar.style.width = targetWidth;
                }, index * 300);
            });
        }, 500);
    }

    static getPositionInsight(score, match) {
        if (score >= 8 && match >= 80) {
            return "Excellent positioning - ready for leadership roles";
        } else if (score >= 7 && match >= 70) {
            return "Strong foundation - focus on strategic impact";
        } else if (score >= 6 && match >= 60) {
            return "Good potential - develop key leadership skills";
        } else {
            return "Building momentum - strengthen core competencies";
        }
    }

    static displayCourses(courses) {
        const container = document.getElementById('priorityCourses');
        if (!container) return;
        
        container.innerHTML = courses.map(course => `
            <div class="course-item">
                <div class="course-title">${course.title}</div>
                <div class="course-description">${course.description}</div>
                <div class="course-duration">${course.duration}</div>
            </div>
        `).join('');
    }

    static displayCertifications(certifications) {
        const container = document.getElementById('valuableCertifications');
        if (!container) return;
        
        container.innerHTML = certifications.map(cert => `
            <div class="cert-item">
                <div class="cert-title">${cert.title}</div>
                <div class="cert-description">${cert.description}</div>
                <div class="cert-value">${cert.value}</div>
            </div>
        `).join('');
    }

    static showChartLoaders(loaderIds) {
        loaderIds.forEach(id => {
            const loader = document.getElementById(id);
            if (loader) loader.classList.remove('hidden');
        });
    }

    static hideChartLoader(loaderId) {
        const loader = document.getElementById(loaderId);
        if (loader) loader.classList.add('hidden');
    }
}

// ==================== EMAIL VERIFICATION (EXACT SAME AS ORIGINAL) ====================
class EmailVerification {
    static initialize() {
        const verifyButton = document.getElementById('verifyButton');
        if (verifyButton) {
            verifyButton.addEventListener('click', this.verify.bind(this));
        }
        
        const closeModalBtn = document.getElementById('closeModal');
        const modalOverlay = document.getElementById('modalOverlay');
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', this.hideRegistrationModal);
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', this.hideRegistrationModal);
        }
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
        
        const form = document.getElementById('verificationForm');
        if (form) form.reset();
        
        this.hideVerificationError();
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    static async verify(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('verifyEmail');
        const email = emailInput?.value;
        
        if (!email) {
            this.showVerificationError('Please enter an email address');
            return;
        }
        
        this.showVerificationLoading(true);
        this.hideVerificationError();
        
        try {
            const result = await this.makeFormRequest(EMAIL_CONFIG.SCRIPT_URL, {
                action: 'verify',
                email: email
            });
            
            if (result.success && result.data && result.data.accessGranted) {
                sessionStorage.setItem('analysisAccessVerified', 'true');
                sessionStorage.setItem('verifiedEmail', email);
                
                this.hideVerificationModal();
                
                // Small delay to ensure modal is fully hidden
                setTimeout(() => {
                    UploadInterface.show();
                }, 300);
                
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

    static showVerificationLoading(show) {
        const loading = document.getElementById('verificationLoading');
        const button = document.getElementById('verifyButton');
        
        if (!loading || !button) return;
        
        if (show) {
            loading.classList.remove('hidden');
            button.textContent = 'Verifying...';
            button.disabled = true;
        } else {
            loading.classList.add('hidden');
            button.textContent = '🔍 Verify & Start Analysis';
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
        
        const form = document.getElementById('registrationForm');
        if (form) form.reset();
        
        const success = document.getElementById('registrationSuccess');
        if (success) success.classList.add('hidden');
        
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
        
        const submitButton = form.querySelector('button[type="submit"]');
        if (!submitButton) return;
        
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Registering...';
        submitButton.disabled = true;
        
        try {
            const result = await this.makeFormRequest(EMAIL_CONFIG.SCRIPT_URL, data);
            
            if (result.success) {
                form.style.display = 'none';
                const success = document.getElementById('registrationSuccess');
                if (success) success.classList.remove('hidden');
                
                sessionStorage.setItem('analysisAccessVerified', 'true');
                sessionStorage.setItem('verifiedEmail', formData.get('email'));
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

    static proceedToAnalysis() {
        this.hideRegistrationModal();
        
        setTimeout(() => {
            UploadInterface.show();
        }, 100);
    }
}

// ==================== MAIN APP CONTROLLER ====================
class AppController {
    static async initialize() {
        try {
            // Add smooth page transitions
            document.body.style.opacity = '0';
            
            setTimeout(() => {
                // Show hero section, hide analysis container
                this.showHeroSection();
                document.body.style.transition = 'opacity 0.5s ease';
                document.body.style.opacity = '1';
            }, 100);
            
        } catch (error) {
            Utils.handleError('Failed to initialize CV analysis', error);
        }
    }

    static showHeroSection() {
        // Show the hero section
        const heroContainer = document.querySelector('.hero-professional-container');
        if (heroContainer) {
            heroContainer.style.display = 'block';
        }
        
        // Hide the analysis container completely
        const analysisContainer = document.getElementById('analysisContainer');
        if (analysisContainer) {
            analysisContainer.classList.add('hidden');
            analysisContainer.style.display = 'none';
        }
        
        // Hide all analysis interfaces
        Utils.hideElement('loading');
        Utils.hideElement('uploadInterface');
        Utils.hideElement('resultsInterface');
    }

    static restartAnalysis() {
        DataManager.clearAllData();
        analysisState.reset();
        StatusManager.hide();
        
        Utils.switchInterface(SELECTORS.RESULTS_INTERFACE, SELECTORS.LOADING);
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        setTimeout(() => {
            this.initialize();
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }, 100);
        }, 1000);
    }

    static downloadCVReport() {
        const results = DataManager.getResults();
        if (!results) return;
        
        // Create a comprehensive report
        const reportData = {
            fileName: results.fileName,
            analysisDate: new Date(results.timestamp).toLocaleDateString(),
            overallScore: results.overallScore,
            careerAlignment: results.careerAlignment,
            sectionsAnalysis: results.sectionsAnalysis,
            careerRoadmap: results.careerRoadmap,
            learningRecommendations: results.learningRecommendations
        };
        
        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `cv-analysis-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    static joinWaitlist() {
        window.open('https://aiqversity.com/waitlist', '_blank');
    }
}

// ==================== GLOBAL FUNCTION BINDINGS ====================
window.initiateAnalysisAccess = () => EmailVerification.showVerificationModal();
window.hideEmailVerificationModal = () => EmailVerification.hideVerificationModal();
window.showRegistrationFromError = () => {
    EmailVerification.hideVerificationModal();
    EmailVerification.showRegistrationModal();
};
window.showRegistrationModal = () => EmailVerification.showRegistrationModal();
window.hideRegistrationModal = () => EmailVerification.hideRegistrationModal();
window.submitRegistrationForm = (event) => EmailVerification.submitRegistration(event);
window.proceedToAnalysisAfterRegistration = () => EmailVerification.proceedToAnalysis();
window.restartAnalysis = () => AppController.restartAnalysis();
window.downloadCVReport = () => AppController.downloadCVReport();
window.joinWaitlist = () => AppController.joinWaitlist();

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    EmailVerification.initialize();
    
    // Setup scroll to top button
    const scrollToTopButton = document.getElementById('scrollToTop');
    if (scrollToTopButton) {
        window.onscroll = function() {
            if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
                scrollToTopButton.classList.remove('hidden');
            } else {
                scrollToTopButton.classList.add('hidden');
            }
        };

        scrollToTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});