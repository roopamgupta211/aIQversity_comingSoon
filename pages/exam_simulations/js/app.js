// Centralized Exam System: app.js
// ==================== DYNAMIC CONFIGURATION ====================
// Configuration will be set from HTML file via window.EXAM_CONFIG
const getConfig = () => {
    return window.EXAM_CONFIG || {
        TIMER_INTERVAL: 1000,
        SCORE_THRESHOLDS: { EXCELLENT: 80, GOOD: 60, AVERAGE: 40 },
        MARKING_SCHEME: { CORRECT: 2, INCORRECT: -0.50, UNATTEMPTED: 0 },
        PERFORMANCE_LEVELS: {
            EXCELLENT: 'Excellent',
            GOOD: 'Good', 
            AVERAGE: 'Average',
            NEEDS_IMPROVEMENT: 'Needs Improvement'
        },
        DATA_FILE: 'exam-data.json',
        EXAM_CONTEXT: {
            NAME: 'Practice Exam',
            DESCRIPTION: 'This is a practice test.',
            MARKING_INFO: '+2 for correct, -0.50 for wrong answers',
            TARGET_SCORE: '120+ marks out of 200'
        }
    };
};

const CONFIG = getConfig();

const EMAIL_CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyqQ0QocnrUgrIC3h3Tv6tXZHBlgVTnhiwmdXZiJBPO1-lbB8HgMsNcMEzx32gvjWeZhA/exec'
};

const SELECTORS = {
    LOADING: 'loading',
    EXAM_INTERFACE: 'examInterface', 
    RESULTS_INTERFACE: 'resultsInterface',
    REVIEW_INTERFACE: 'reviewInterface',
    QUESTION_LIST: 'questionList',
    TIMER: 'timer'
};

const GEMINI_CONFIG = {
    API_KEY: 'AIzaSyBr38XKvBXOz4eN8r9lkEuj2izj4Ag_zsg',
    MODEL: 'gemini-2.0-flash-001',
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/'
};

// ==================== GLOBAL STATE ====================
class ExamState {
    constructor() {
        this.examData = [];
        this.currentQuestion = 0;
        this.answers = {};
        this.startTime = null;
        this.timerInterval = null;
        this.examDuration = 0;
        this.skillsRadarChart = null;
        this.progressGaugeChart = null;
    }

    reset() {
        this.currentQuestion = 0;
        this.answers = {};
        this.startTime = null;
        this.examDuration = 0;
        this.clearTimer();
        this.destroyCharts();
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    destroyCharts() {
        if (this.skillsRadarChart) {
            this.skillsRadarChart.destroy();
            this.skillsRadarChart = null;
        }
        if (this.progressGaugeChart) {
            this.progressGaugeChart.destroy();
            this.progressGaugeChart = null;
        }
    }
}

const examState = new ExamState();

// Sample data
const sampleExamData = [
    {
        "question_id": 1,
        "Question": "What was the most probable capital of the Kuninda dynasty in ancient Uttarakhand?",
        "options": {
            "a": "Joshimath",
            "b": "Kartikeyapura",
            "c": "Kalsi (Kalkut)",
            "d": "Lakhamandal"
        },
        "correct_answer": "c",
        "Solution": "The Kuninda dynasty, an ancient ruling power in Uttarakhand (200 BC – 300 AD), had several important administrative centers. Kalsi, also known as Kalkut, located near present-day Dehradun, is considered by historians to be one of its most significant capitals.",
        "step_by_step": [
            "Recall the major ancient dynasties of Uttarakhand.",
            "Identify the Kuninda dynasty and its general period of rule.",
            "Consider the prominent ancient sites in Uttarakhand.",
            "Relate archaeological findings to potential capitals."
        ],
        "tips_and_tricks": [
            "Focus on understanding the geographical spread and important centers of major Uttarakhand dynasties.",
            "Archaeological sites with significant inscriptions are often indicative of administrative importance."
        ],
        "classification": {
            "paper": "Paper 1: General Studies",
            "subject": "Sample Subject",
            "topic": "Sample Topic",
            "subtopic": "Sample Subtopic",
            "sub_subtopic": "Sample Sub-subtopic",
            "concept": "Sample Concept"
        },
        "difficulty_level": "Moderate",
        "blooms_taxonomy": "Remembering"
    },
    {
        "question_id": 2,
        "Question": "The Chipko Movement, a significant environmental movement in Uttarakhand, primarily started in which district?",
        "options": {
            "a": "Nainital",
            "b": "Almora", 
            "c": "Tehri Garhwal",
            "d": "Chamoli"
        },
        "correct_answer": "d",
        "Solution": "The Chipko Movement, known for its non-violent resistance to deforestation, originated in the early 1970s in the Chamoli district of Uttarakhand.",
        "step_by_step": [
            "Recall major people's movements in Uttarakhand.",
            "Identify the Chipko Movement and its core objective.",
            "Remember the key geographical area associated with the movement."
        ],
        "tips_and_tricks": [
            "Associate Chipko Movement with prominent figures like Sunderlal Bahuguna.",
            "Remember specific incidents like the one in Reni village (1974)."
        ],
        "classification": {
            "paper": "Paper 1: General Studies",
            "subject": "Sample Subject", 
            "topic": "Sample Topic",
            "subtopic": "Sample Subtopic",
            "sub_subtopic": "Sample Sub-subtopic",
            "concept": "Sample Concept"
        },
        "difficulty_level": "Easy",
        "blooms_taxonomy": "Remembering"
    }
];

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

    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}m ${secs}s`;
    }

    static handleError(message, error) {
        console.error(message, error);
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `<h2>Error</h2><p>${message}. Please refresh and try again.</p>`;
        }
    }

    static getPerformanceLevel(score) {
        if (score >= CONFIG.SCORE_THRESHOLDS.EXCELLENT) return CONFIG.PERFORMANCE_LEVELS.EXCELLENT;
        if (score >= CONFIG.SCORE_THRESHOLDS.GOOD) return CONFIG.PERFORMANCE_LEVELS.GOOD;
        if (score >= CONFIG.SCORE_THRESHOLDS.AVERAGE) return CONFIG.PERFORMANCE_LEVELS.AVERAGE;
        return CONFIG.PERFORMANCE_LEVELS.NEEDS_IMPROVEMENT;
    }

    static buildTopicHierarchy(classification) {
        const parts = [
            classification.subject,
            classification.topic,
            classification.subtopic,
            classification.sub_subtopic,
            classification.concept
        ].filter(part => part && part.trim() !== '');
        
        return parts.join(' → ');
    }
}

// ==================== DATA MANAGER ====================
class DataManager {
    static async loadExamData() {
        const response = await fetch(CONFIG.DATA_FILE);
        if (!response.ok) {
            throw new Error('Failed to load exam data file');
        }
        
        examState.examData = await response.json();
        
        if (!examState.examData || examState.examData.length === 0) {
            throw new Error('No exam data available');
        }
    }

    static storeResults(results) {
        console.log('Storing fresh exam results:', results.timestamp);
        localStorage.setItem('examResults', JSON.stringify(results));
    }

    static getResults() {
        const stored = localStorage.getItem('examResults');
        return stored ? JSON.parse(stored) : null;
    }

    static clearAllData() {
        localStorage.clear();
        sessionStorage.clear();
    }
}

// ==================== TIMER MANAGER ====================
class TimerManager {
    static initialize() {
        examState.startTime = new Date();
        this.showTimer();
        this.start();
    }

    static start() {
        examState.timerInterval = setInterval(this.update, CONFIG.TIMER_INTERVAL);
    }

    static update() {
        const now = new Date();
        const elapsed = Math.floor((now - examState.startTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    static stop() {
        examState.clearTimer();
        examState.examDuration = Math.floor((new Date() - examState.startTime) / 1000);
    }

    static showTimer() {
        const timer = document.getElementById('timer');
        const homeButton = document.getElementById('homeButton');
        
        if (timer && homeButton) {
            timer.classList.remove('hidden');
            homeButton.classList.add('hidden');
        }
    }

    static hideTimer() {
        const timer = document.getElementById('timer');
        const homeButton = document.getElementById('homeButton');
        
        if (timer && homeButton) {
            timer.classList.add('hidden');
            homeButton.classList.remove('hidden');
        }
    }
}

// ==================== QUESTION MANAGER ====================
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
            btn.classList.remove('current');
            if (index === examState.currentQuestion) {
                btn.classList.add('current');
            }
            if (examState.answers[index] !== undefined) {
                btn.classList.add('answered');
            }
        });
    }

    static async load(index) {
        examState.currentQuestion = index;
        const question = examState.examData[index];
        
        await this.updateQuestionDisplay(question, index);
        this.updateOptions(question, index);
        this.updateNavigationButtons(index);
        this.updateNavigation();
        this.updateClearButton();
    }

    static async updateQuestionDisplay(question, index) {
        const questionNumber = document.getElementById('questionNumber');
        const questionMeta = document.getElementById('questionMeta');
        const questionText = document.getElementById('questionText');
        
        if (questionNumber) questionNumber.textContent = `Question ${index + 1} of ${examState.examData.length}`;
        if (questionMeta) questionMeta.textContent = `${question.classification.subject} | ${question.difficulty_level}`;
        
        if (questionText) {
            questionText.innerHTML = '';
            
            const textDiv = document.createElement('div');
            textDiv.textContent = question.Question;
            textDiv.className = 'question-text-content';
            questionText.appendChild(textDiv);
        
            // Try to load image if available
            const availableImages = await this.getAvailableImages();
            if (availableImages.includes(question.question_id)) {
                const img = document.createElement('img');
                img.src = `./images/Q${question.question_id}.png`;
                img.className = 'question-image';
                img.alt = `Question ${question.question_id} diagram`;
                questionText.appendChild(img);
            }
        }
    }

    static async getAvailableImages() {
        if (!this.availableImagesList) {
            try {
                const response = await fetch('./images/index.json');
                const data = await response.json();
                this.availableImagesList = data.available_images;
            } catch (error) {
                console.log('No images index found');
                this.availableImagesList = [];
            }
        }
        return this.availableImagesList;
    }

    static updateOptions(question, index) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        
        Object.entries(question.options).forEach(([key, value]) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.onclick = () => this.selectOption(key);
            
            const isSelected = examState.answers[index] === key;
            if (isSelected) optionDiv.classList.add('selected');
            
            optionDiv.innerHTML = `
                <input type="radio" name="option" value="${key}" ${isSelected ? 'checked' : ''}>
                <span><strong>${key.toUpperCase()}.</strong> ${value}</span>
            `;
            
            const radioInput = optionDiv.querySelector('input[type="radio"]');
            radioInput.onclick = (e) => e.preventDefault();
            
            optionsContainer.appendChild(optionDiv);
        });
    }

    static updateNavigationButtons(index) {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        const clearBtn = document.getElementById('clearBtn');
        
        if (prevBtn) prevBtn.style.display = index === 0 ? 'none' : 'block';
        if (nextBtn) nextBtn.style.display = index === examState.examData.length - 1 ? 'none' : 'block';
        if (submitBtn) {
            if (index === examState.examData.length - 1) {
                submitBtn.classList.remove('hidden');
                submitBtn.style.display = 'block';
            } else {
                submitBtn.classList.add('hidden');
                submitBtn.style.display = 'none';
            }
        }

        if (clearBtn) {
            clearBtn.style.display = 'block';
            clearBtn.style.visibility = 'visible';
            clearBtn.classList.remove('hidden');
        }
        this.updateClearButton();
    }

    static selectOption(option) {
        examState.answers[examState.currentQuestion] = option;
        
        const options = document.querySelectorAll('.option');
        options.forEach(opt => opt.classList.remove('selected'));
        
        const radioButtons = document.querySelectorAll('.option input[type="radio"]');
        radioButtons.forEach(radio => radio.checked = false);
        
        const selectedOption = document.querySelector(`.option input[value="${option}"]`);
        if (selectedOption) {
            const parentElement = selectedOption.parentElement;
            parentElement.classList.add('selected');
            selectedOption.checked = true;
        }
        
        this.updateNavigation();
        this.updateClearButton();
    }

    static clearCurrentAnswer() {
        delete examState.answers[examState.currentQuestion];
        
        const options = document.querySelectorAll('.option');
        options.forEach(opt => opt.classList.remove('selected'));
        
        const radioButtons = document.querySelectorAll('.option input[type="radio"]');
        radioButtons.forEach(radio => radio.checked = false);
        
        this.updateNavigation();
        this.updateClearButton();
    }

    static updateClearButton() {
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            const hasAnswer = examState.answers[examState.currentQuestion] !== undefined;
            clearBtn.style.display = 'block';
            clearBtn.style.visibility = 'visible';
            clearBtn.classList.remove('hidden');
            clearBtn.style.opacity = hasAnswer ? '1' : '0.5';
            clearBtn.disabled = !hasAnswer;
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

// ==================== RESULTS CALCULATOR ====================
class ResultsCalculator {
    static calculate() {
        const basicStats = this.calculateBasicStats();
        const analytics = this.calculateAnalytics();
        const results = this.buildResultsObject(basicStats, analytics);
        DataManager.storeResults(results);
        return results;
    }

    static calculateBasicStats() {
        let correct = 0, incorrect = 0, unattempted = 0, totalMarks = 0;
        
        examState.examData.forEach((question, index) => {
            const userAnswer = examState.answers[index];
            const isCorrect = userAnswer === question.correct_answer;
            const isAttempted = userAnswer !== undefined;
            
            if (isAttempted) {
                if (isCorrect) {
                    correct++;
                    totalMarks += CONFIG.MARKING_SCHEME.CORRECT;
                } else {
                    incorrect++;
                    totalMarks += CONFIG.MARKING_SCHEME.INCORRECT;
                }
            } else {
                unattempted++;
            }
        });
        
        return { correct, incorrect, unattempted, totalMarks };
    }

    static calculateAnalytics() {
        const analytics = {
            subjectStats: {},
            topicStats: {},
            difficultyStats: {},
            bloomsStats: {},
            conceptStats: {}
        };
        
        examState.examData.forEach((question, index) => {
            const userAnswer = examState.answers[index];
            const isCorrect = userAnswer === question.correct_answer;
            
            this.updateStatCategory(analytics.subjectStats, question.classification.subject, isCorrect);
            this.updateStatCategory(analytics.topicStats, question.classification.topic, isCorrect);
            this.updateStatCategory(analytics.difficultyStats, question.difficulty_level, isCorrect);
            this.updateStatCategory(analytics.bloomsStats, question.blooms_taxonomy, isCorrect);
            this.updateStatCategory(analytics.conceptStats, question.classification.concept, isCorrect);
        });
        
        return analytics;
    }

    static updateStatCategory(statsObject, category, isCorrect) {
        if (!statsObject[category]) {
            statsObject[category] = { total: 0, correct: 0 };
        }
        statsObject[category].total++;
        if (isCorrect) statsObject[category].correct++;
    }

    static buildResultsObject(basicStats, analytics) {
        const maxPossibleMarks = examState.examData.length * CONFIG.MARKING_SCHEME.CORRECT;
        const scorePercentage = basicStats.totalMarks >= 0 ? 
            Math.round((basicStats.totalMarks / maxPossibleMarks) * 100) :
            Math.max(0, Math.round((basicStats.totalMarks / maxPossibleMarks) * 100));
            
        return {
            score: Math.max(0, scorePercentage),
            totalMarks: basicStats.totalMarks,
            maxMarks: maxPossibleMarks,
            correct: basicStats.correct,
            incorrect: basicStats.incorrect,
            unattempted: basicStats.unattempted,
            total: examState.examData.length,
            duration: examState.examDuration,
            ...analytics,
            answers: examState.answers,
            timestamp: new Date().toISOString()
        };
    }
}

// ==================== RESULTS DISPLAY ====================
class ResultsDisplay {
    static show() {
        const results = DataManager.getResults();
        Utils.switchInterface(SELECTORS.EXAM_INTERFACE, SELECTORS.RESULTS_INTERFACE);
        
        this.displayHeroSection(results);
        this.displayQuickStats(results);
        this.displayPerformanceMatrix(results);
        AIInsights.generate(results);

        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 100);
    }

    static displayHeroSection(results) {
        const greetingElement = document.getElementById('personalizedGreeting');
        const subtextElement = document.getElementById('heroSubtext');
        
        if (greetingElement) greetingElement.textContent = "We are analyzing your performance...";
        if (subtextElement) {
            const attemptedQuestions = results.correct + results.incorrect;
            const marksText = results.totalMarks >= 0 ? 
                `${results.totalMarks} marks earned` : 
                `${results.totalMarks} marks (negative marking)`;
            subtextElement.textContent = `Attempted ${attemptedQuestions} questions • ${results.correct} correct answers • ${results.incorrect} wrong answers • ${marksText}`;
        }
        this.animateScoreCircle(results.score);
    }

    static animateScoreCircle(score) {
        const circle = document.getElementById('scoreProgress');
        const scoreText = document.querySelector('#scoreCircle .score-text span');
        
        if (!circle || !scoreText) return;
        
        const circumference = 2 * Math.PI * 50;
        const offset = circumference - (score / 100) * circumference;
        
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
                scoreText.textContent = Math.round(currentScore) + '%';
            }, 50);
        }, 500);
    }

    static displayQuickStats(results) {
        const elements = {
            correctCount: document.getElementById('correctCount'),
            timeTaken: document.getElementById('timeTaken'),
            strengthCount: document.getElementById('strengthCount'),
            focusCount: document.getElementById('focusCount')
        };

        if (elements.correctCount) elements.correctCount.textContent = results.correct;
        if (elements.timeTaken) elements.timeTaken.textContent = Utils.formatTime(results.duration);
        
        const topicEntries = Object.entries(results.topicStats);
        const strongTopics = topicEntries.filter(([_, stats]) => {
            const accuracy = stats.correct / stats.total;
            return accuracy >= 0.7 && stats.total > 0;
        }).length;
        
        const focusAreas = topicEntries.filter(([_, stats]) => {
            const accuracy = stats.correct / stats.total;
            return accuracy < 0.5 && stats.total > 0;
        }).length;
        
        if (elements.strengthCount) elements.strengthCount.textContent = strongTopics;
        if (elements.focusCount) elements.focusCount.textContent = focusAreas;
        
        this.updateStatChanges(results, strongTopics, focusAreas);
    }

    static updateStatChanges(results, strongTopics, focusAreas) {
        const changes = {
            correct: document.querySelector('#correctCount')?.nextElementSibling?.nextElementSibling,
            time: document.querySelector('#timeTaken')?.nextElementSibling?.nextElementSibling,
            strength: document.querySelector('#strengthCount')?.nextElementSibling?.nextElementSibling,
            focus: document.querySelector('#focusCount')?.nextElementSibling?.nextElementSibling
        };

        if (changes.correct) {
            if (results.score >= 80) {
                changes.correct.textContent = 'Excellent work!';
                changes.correct.className = 'stat-change positive';
            } else if (results.score >= 60) {
                changes.correct.textContent = 'Good progress';
                changes.correct.className = 'stat-change positive';
            } else {
                changes.correct.textContent = 'Room to improve';
                changes.correct.className = 'stat-change improvement';
            }
        }

        const avgTime = results.duration / Object.keys(results.answers).length;
        if (changes.time) {
            if (avgTime < 60) {
                changes.time.textContent = 'Fast pace';
                changes.time.className = 'stat-change positive';
            } else if (avgTime < 120) {
                changes.time.textContent = 'Steady pace';
                changes.time.className = 'stat-change neutral';
            } else {
                changes.time.textContent = 'Consider speeding up';
                changes.time.className = 'stat-change improvement';
            }
        }

        if (changes.strength) {
            if (strongTopics > 0) {
                changes.strength.textContent = `${strongTopics} areas mastered`;
                changes.strength.className = 'stat-change positive';
            } else {
                changes.strength.textContent = 'Building foundation';
                changes.strength.className = 'stat-change improvement';
            }
        }

        if (changes.focus) {
            if (focusAreas === 0) {
                changes.focus.textContent = 'Well balanced';
                changes.focus.className = 'stat-change positive';
            } else {
                changes.focus.textContent = `${focusAreas} needs attention`;
                changes.focus.className = 'stat-change improvement';
            }
        }
    }

    static displayPerformanceMatrix(results) {
        this.displaySubjectMatrix(results.subjectStats);
        this.displayDifficultyMatrix(results.difficultyStats);
        this.displayLearningVelocity(results);
        this.displayKnowledgeCoverage(results);
    }

    static displaySubjectMatrix(subjectStats) {
        const container = document.getElementById('subjectMatrix');
        if (!container) return;
        
        let html = '';
        
        Object.entries(subjectStats).forEach(([subject, stats]) => {
            const percentage = Math.round((stats.correct / stats.total) * 100);
            const color = percentage >= 70 ? '#10B981' : percentage >= 40 ? '#F7A621' : '#EF4444';
            
            html += `
                <div style="display: flex; justify-content: space-between; margin: 12px 0;">
                    <span style="font-size: 0.9em;">${subject}</span>
                    <span style="font-weight: bold; color: ${color};">${percentage}%</span>
                </div>
                <div style="background: #e9ecef; height: 6px; border-radius: 3px; margin-bottom: 8px;">
                    <div style="background: ${color}; height: 100%; width: ${percentage}%; border-radius: 3px; transition: width 1s ease;"></div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    static displayDifficultyMatrix(difficultyStats) {
        const container = document.getElementById('difficultyMatrix');
        if (!container) return;
        
        const difficulties = Object.keys(difficultyStats);
        let html = '';
        
        difficulties.forEach(difficulty => {
            const stats = difficultyStats[difficulty];
            if (stats) {
                const percentage = Math.round((stats.correct / stats.total) * 100);
                const color = difficulty === 'Easy' ? '#10B981' : 
                             difficulty === 'Moderate' ? '#F7A621' : 
                             difficulty === 'Hard' ? '#EF4444' :
                             difficulty === 'Difficult' ? '#EF4444' : '#6B7280';
                
                html += `
                    <div style="display: flex; justify-content: space-between; margin: 12px 0;">
                        <span style="font-size: 0.9em;">${difficulty}</span>
                        <span style="font-weight: bold; color: ${color};">${stats.correct}/${stats.total}</span>
                    </div>
                    <div style="background: #e9ecef; height: 6px; border-radius: 3px; margin-bottom: 8px;">
                        <div style="background: ${color}; height: 100%; width: ${percentage}%; border-radius: 3px; transition: width 1s ease;"></div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html || '<p style="color: #6c757d; font-size: 0.9em;">No difficulty data available</p>';
    }

    static displayLearningVelocity(results) {
        const container = document.getElementById('learningVelocity');
        if (!container) return;
        
        const avgTime = results.duration / Object.keys(results.answers).length;
        const velocity = avgTime < 60 ? 'Fast' : avgTime < 120 ? 'Steady' : 'Thoughtful';
        const velocityColor = velocity === 'Fast' ? '#10B981' : velocity === 'Steady' ? '#F7A621' : '#6366f1';
        
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 2em; margin-bottom: 10px;">${velocity}</div>
                <div style="color: ${velocityColor}; font-weight: bold; margin-bottom: 5px;">${Math.round(avgTime)}s per question</div>
                <div style="font-size: 0.8em; color: #6c757d;">Learning pace</div>
            </div>
        `;
    }

    static displayKnowledgeCoverage(results) {
        const container = document.getElementById('knowledgeCoverage');
        if (!container) return;
        
        const totalSubjects = Object.keys(results.subjectStats).length;
        const totalTopics = Object.keys(results.topicStats).length;
        const questionsAttempted = Object.keys(results.answers).length;
        
        const coveragePercentage = Math.round((questionsAttempted / examState.examData.length) * 100);
        const coverageColor = coveragePercentage >= 80 ? '#10B981' : coveragePercentage >= 60 ? '#F7A621' : '#6366f1';
        
        container.innerHTML = `
            <div style="text-align: center; padding: 15px;">
                <div style="font-size: 1.8em; margin-bottom: 8px; color: ${coverageColor}; font-weight: bold;">${coveragePercentage}%</div>
                <div style="color: #6c757d; font-size: 0.85em; margin-bottom: 12px;">Questions Attempted</div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #101E3D;">
                    <span>${totalSubjects} Subjects</span>
                    <span>${totalTopics} Topics</span>
                </div>
            </div>
        `;
    }
}

// ==================== AI INSIGHTS ====================
class AIInsights {
    static async generate(results) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_CONFIG.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: this.createPrompt(results) }]
                    }]
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            const aiResponse = data.candidates[0].content.parts[0].text;
            const insights = this.parseResponse(aiResponse);
            
            this.display(insights);
            
        } catch (error) {
            console.error('Gemini API Error:', error);
            this.displayError();
        }
    }

    static createPrompt(results) {
        const weakTopics = Object.entries(results.topicStats)
            .filter(([_, stats]) => (stats.correct / stats.total) < 0.6)
            .map(([topic, stats]) => `${topic} (${stats.correct}/${stats.total})`);
        
        const strongTopics = Object.entries(results.topicStats)
            .filter(([_, stats]) => (stats.correct / stats.total) >= 0.7)
            .map(([topic, stats]) => `${topic} (${stats.correct}/${stats.total})`);

        const questionAnalysis = examState.examData.map((question, index) => {
            const userAnswer = examState.answers[index];
            const isCorrect = userAnswer === question.correct_answer;
            const isAttempted = userAnswer !== undefined;
            
            return {
                subject: question.classification.subject,
                topic: question.classification.topic,
                subtopic: question.classification.subtopic,
                sub_subtopic: question.classification.sub_subtopic,
                concept: question.classification.concept,
                difficulty: question.difficulty_level,
                blooms: question.blooms_taxonomy,
                attempted: isAttempted,
                correct: isCorrect
            };
        });

        const attemptedQuestions = questionAnalysis.filter(q => q.attempted);
        const timePerQuestion = Math.round(results.duration / attemptedQuestions.length);
        const efficiencyScore = timePerQuestion < 60 ? "highly efficient" : timePerQuestion < 120 ? "balanced" : "thoughtful and deliberate";

        // Enhanced data science analysis for personalized scheduling
        const enhancedAnalysis = this.generateEnhancedAnalysis(results, questionAnalysis);

        return `You are an expert educational psychologist and learning analytics specialist. Analyze this student's comprehensive exam performance to create their unique "Performance DNA" - a personalized cognitive and learning profile.

    **${CONFIG.EXAM_CONTEXT.NAME} EXAM CONTEXT:**
    ${CONFIG.EXAM_CONTEXT.DESCRIPTION} The actual exam features ${CONFIG.EXAM_CONTEXT.MARKING_INFO}. ${CONFIG.EXAM_CONTEXT.TARGET_SCORE} to qualify for next stages.

    **STUDENT PERFORMANCE DATA:**
    Overall Achievement: ${results.score}% (${results.correct}/${results.total} correct, ${results.totalMarks} marks)
    Learning Pace: ${Math.floor(results.duration / 60)}m ${results.duration % 60}s total (${timePerQuestion}s per question - ${efficiencyScore})
    Engagement Level: ${attemptedQuestions.length}/${examState.examData.length} questions attempted (${Math.round((attemptedQuestions.length/examState.examData.length)*100)}%)

    **COGNITIVE PATTERNS:**
    Mastery Areas: ${strongTopics.join(', ') || 'Building foundational skills across all areas'}
    Growth Opportunities: ${weakTopics.join(', ') || 'Maintaining consistent high performance'}
    Subject Performance: ${JSON.stringify(results.subjectStats)}
    Difficulty Response: ${JSON.stringify(results.difficultyStats)}
    Cognitive Levels: ${JSON.stringify(results.bloomsStats)}

    **ENHANCED LEARNING ANALYTICS:**
    Subject Learning Velocity: ${JSON.stringify(enhancedAnalysis.subjectVelocity)}
    Cognitive Load Distribution: ${JSON.stringify(enhancedAnalysis.cognitiveLoad)}
    Difficulty Progression Mapping: ${JSON.stringify(enhancedAnalysis.difficultyProgression)}
    Weekly Distribution Strategy: ${JSON.stringify(enhancedAnalysis.weeklyStrategy)}

    **TONE EXAMPLES:**
    CORRECT: "Your cognitive processing style shows you excel at..."
    CORRECT: "You demonstrate a natural ability to..."
    CORRECT: "Your learning pattern reveals you work best when..."
    WRONG: "The student demonstrates..." 
    WRONG: "Their learning pattern..."
    WRONG: "This individual shows..."

    Create EXACTLY this JSON format:

    {
      "personalizedGreeting": "Generate a personalized, encouraging greeting based on the student's performance. Consider their score, engagement level, and time spent. Be specific and motivational. Examples: 'Outstanding work on this challenging exam!' or 'Great start - you're building solid foundations!' or 'Every learning journey begins with brave first steps!' Make it 1 sentence, use exclamation mark, and be genuinely encouraging based on their actual performance.",
      
      "heroSubtext": "Generate a dynamic, celebratory message that shows key metrics in an engaging way. MUST include: performance percentage, correct answers, attempted questions, and total marks (can be negative due to negative marking).
        - High performers (70%+): '<appropriate emoji> <a short message>! <x% score> • <correct answers/attempted questions> nailed it • <x marks earned>'
        - Good performers (50-69%): '<appropriate emoji> <a short message>! <x% score> • <correct answers/attempted questions> on target • <x marks earned>' 
        - Building performers (30-49%): '<appropriate emoji> <a short message>! <x% score> • <correct answers/attempted questions> victories • <x marks earned>'
        - Early learners (<30%): '<appropriate emoji> <a short message>! <x correct answers or y attempts> • <Motivational small message>'
        - Shy learners (no attempts): '<appropriate emoji> <a short message>! <x correct answers or y attempts> • <Motivational small message>
        Use appropriate emojis and make it feel like a personal achievement celebration. Always include the actual numbers: score%, correct/attempted, and total marks. Use examples for inspiration and format, but generate your own text",

      "performanceDNA": "MANDATORY: Provide realistic feedback based on actual performance data. Use only second-person pronouns (you, your, you're). Follow these guidelines:
        IF STUDENT ATTEMPTED 0 QUESTIONS: Start with 'Your learning journey is just beginning...' or 'You're at the starting point...' Acknowledge they haven't attempted questions yet, encourage them to engage with the material, mention that taking the first step is often the hardest, and provide motivation to start attempting questions.
        IF STUDENT ATTEMPTED 1-25% OF QUESTIONS: Start with 'Your learning DNA shows you're taking tentative steps...' Acknowledge limited engagement, identify any patterns from attempted questions, encourage more active participation, and highlight that every expert started somewhere.
        IF STUDENT ATTEMPTED 26-75% OF QUESTIONS: Start with 'Your learning DNA reveals you're actively engaging...' Analyze their actual performance patterns, identify genuine strengths and areas for growth, and provide specific insights based on their responses.
        IF STUDENT ATTEMPTED 76-100% OF QUESTIONS: Start with 'Your learning DNA demonstrates full engagement...' Provide comprehensive analysis of their cognitive patterns, learning strengths, problem-solving approach, and unique intellectual characteristics.
        Always be honest about performance while remaining encouraging. Focus on: (1) Their actual engagement level and what it reveals, (2) Genuine patterns from attempted questions, (3) Realistic next steps for improvement, (4) Encouraging but truthful assessment of their approach. Write 4-5 sentences maximum.",
      
      "studyPlan": {
        "dailySchedule": "Create 7 personalized daily schedules based on the performance analytics. Use this JSON structure but customize content based on student's actual performance patterns:
        [
            {'day': 'Monday', 'study': <hours>, 'rest': <hours>, 'subjects': [{'name': '<actual_subject_name>', 'hours': <hours>}, {'name': '<actual_subject_name>', 'hours': <hours>}]},
            {'day': 'Tuesday', 'study': <hours>, 'rest': <hours>, 'subjects': [{'name': '<actual_subject_name>', 'hours': <hours>}]},
            {'day': 'Wednesday', 'study': <hours>, 'rest': <hours>, 'subjects': [{'name': '<activity_type with actual_subject_name>', 'hours': <hours>}]},
            {'day': 'Thursday', 'study': <hours>, 'rest': <hours>, 'subjects': [{'name': '<actual_subject_name>', 'hours': <hours>}, {'name': '<actual_subject_name>', 'hours': <hours>}]},
            {'day': 'Friday', 'study': <hours>, 'rest': <hours>, 'subjects': [{'name': '<activity_type with actual_subject_name>', 'hours': <hours>}]},
            {'day': 'Saturday', 'study': <hours>, 'rest': <hours>, 'subjects': [{'name': '<actual_subject_name>', 'hours': <hours>}, {'name': '<actual_subject_name>', 'hours': <hours>}]},
            {'day': 'Sunday', 'study': <hours>, 'rest': <hours>, 'subjects': [{'name': '<activity_type with actual_subject_name>', 'hours': <hours>}]}
        ]
        Analyze the cognitive load distribution and subject performance to decide: which subjects need more focus days, optimal daily study hours based on learning velocity, appropriate rest periods, and effective weekly learning rhythm.",
        
        "weeklyFocus": "Design weekly priorities using this structure but base content on performance analytics:
        [
            {'subject': '<actual_subject_name>', 'hours': <number>, 'priority': '<level>', 'color': '<hex_color>'},
            {'subject': '<actual_subject_name>', 'hours': <number>, 'priority': '<level>', 'color': '<hex_color>'},
            {'subject': '<activity_type>', 'hours': <number>, 'priority': '<level>', 'color': '<hex_color>'}
        ]
        Use subject velocity analysis and cognitive load to determine optimal weekly time distribution and priority levels.",
        
        "monthlyTargets": "Create progressive monthly goals using this format but customize based on difficulty progression mapping:
        [
            {'week': 1, 'target': '<specific_target_based_on_weakest_areas>', 'hours': <number>},
            {'week': 2, 'target': '<specific_target_based_on_analysis>', 'hours': <number>},
            {'week': 3, 'target': '<specific_target_based_on_progression>', 'hours': <number>},
            {'week': 4, 'target': '<specific_target_based_on_goals>', 'hours': <number>}
        ]
        Base targets on the student's performance gaps and learning trajectory needs."
    },
      "growthAreas": "Provide 4-5 specific, actionable growth opportunities as HTML with bullet points. Base these directly on performance patterns from the data. Include cognitive strategies, study techniques, and skill-building recommendations."
    }

    **CRITICAL STUDY PLAN REQUIREMENTS:**
    - Use ONLY the actual subject names from the performance data provided above
    - Base daily/weekly schedules entirely on performance gaps (prioritize subjects with <60% accuracy)
    - Generate realistic time allocations (total daily study should be 2-4 hours maximum)
    - Create specific, actionable targets based on actual weak areas identified
    - Never use generic terms like "Subject1", "General Study", "Comprehensive Study"
    - All study plans must be derived from the actual Subject Performance data provided

    **CRITICAL REQUIREMENTS:**
    - Address the student directly using "you" and "your"
    - Be encouraging while remaining truthful to the data
    - Focus on cognitive patterns and learning characteristics
    - Make insights specific to their actual performance
    - Use accessible language, avoid jargon
    - Ensure JSON is perfectly formatted and parseable`;
    }

    static generateEnhancedAnalysis(results, questionAnalysis) {
        // 1. Subject-wise learning velocity analysis
        const subjectVelocity = {};
        Object.entries(results.subjectStats).forEach(([subject, stats]) => {
            const subjectQuestions = questionAnalysis.filter(q => q.subject === subject && q.attempted);
            const avgTimePerSubject = subjectQuestions.length > 0 ? results.duration / subjectQuestions.length : 120;
            subjectVelocity[subject] = {
                timeNeeded: Math.round(avgTimePerSubject),
                complexity: avgTimePerSubject > 90 ? 'high' : avgTimePerSubject > 60 ? 'medium' : 'low'
            };
        });

        // 2. Cognitive load distribution analysis
        const cognitiveLoad = {};
        Object.entries(results.subjectStats).forEach(([subject, stats]) => {
            const accuracy = (stats.correct / stats.total) * 100;
            const load = accuracy < 40 ? 'heavy' : accuracy < 70 ? 'moderate' : 'light';
            cognitiveLoad[subject] = { load, accuracy };
        });

        // 3. Difficulty progression mapping
        const difficultyProgression = {};
        Object.entries(results.subjectStats).forEach(([subject, stats]) => {
            const subjectQuestions = questionAnalysis.filter(q => q.subject === subject);
            const easyCount = subjectQuestions.filter(q => q.difficulty === 'Easy').length;
            const moderateCount = subjectQuestions.filter(q => q.difficulty === 'Moderate').length;
            const hardCount = subjectQuestions.filter(q => q.difficulty === 'Hard').length;
            
            difficultyProgression[subject] = {
                hasEasy: easyCount > 0,
                hasModerate: moderateCount > 0,
                hasHard: hardCount > 0,
                recommendedStart: stats.correct / stats.total < 0.5 ? 'easy' : 'moderate'
            };
        });

        // 4. Weekly distribution strategy
        const weeklyStrategy = this.generateWeeklyDistributionStrategy(results.subjectStats);

        return {
            subjectVelocity,
            cognitiveLoad,
            difficultyProgression,
            weeklyStrategy
        };
    }

    static generateWeeklyDistributionStrategy(subjectStats) {
        const subjects = Object.entries(subjectStats).map(([subject, stats]) => ({
            subject,
            accuracy: (stats.correct / stats.total) * 100,
            priority: stats.correct / stats.total < 0.4 ? 'urgent' : 
                     stats.correct / stats.total < 0.7 ? 'important' : 'maintenance'
        })).sort((a, b) => a.accuracy - b.accuracy);

        return {
            mondayFocus: subjects.slice(0, 2).map(s => s.subject), // Worst 2 subjects
            tuesdayFocus: subjects.length > 2 ? [subjects[2].subject] : [subjects[0].subject],
            wednesdayFocus: ['Practice', 'Review'], // Mixed practice day
            thursdayFocus: subjects.slice(0, 2).map(s => s.subject), // Repeat worst subjects
            fridayFocus: ['Mock Tests', 'Assessment'],
            saturdayFocus: subjects.slice(-2).map(s => s.subject), // Best subjects for confidence
            sundayFocus: ['Revision', 'Light Review']
        };
    }

    static parseResponse(aiResponse) {
        try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in response');
            }
        } catch (error) {
            console.error('Error parsing AI response:', error);
            throw new Error('Failed to parse AI insights');
        }
    }

    static display(insights) {
        this.removeLoadingAnimations();

        const greetingElement = document.getElementById('personalizedGreeting');
        const subtextElement = document.getElementById('heroSubtext');
        
        if (greetingElement && insights.personalizedGreeting) {
            greetingElement.textContent = insights.personalizedGreeting;
        }
        
        const performanceInsight = document.getElementById('aiPerformanceInsight');
        if (performanceInsight) {
            performanceInsight.innerHTML = `<div style="font-size: 0.95em; line-height: 1.6; color: #2d3748;">${insights.performanceDNA}</div>`;
        }
        
        StudyPlanDisplay.show(insights.studyPlan);
        
        const results = DataManager.getResults();
        GrowthDisplay.show(results);
    }

    static displayError() {
        this.removeLoadingAnimations();
        
        const performanceInsight = document.getElementById('aiPerformanceInsight');
        if (performanceInsight) {
            performanceInsight.innerHTML = '<div style="color: #EF4444; font-style: italic; text-align: center; padding: 20px;">⚠️ AI insights unavailable. Please check API configuration.</div>';
        }
    }

    static removeLoadingAnimations() {
        const loaders = document.querySelectorAll('.insight-loader, .plan-loader');
        loaders.forEach(loader => {
            if (loader) loader.style.display = 'none';
        });
    }

    static getPrioritySubjectsForDay(results) {
        if (!results || !results.subjectStats) {
            return ['Mathematics', 'Science', 'General Knowledge'];
        }
        
        // Get subjects sorted by performance (worst first for priority focus)
        const subjectPerformance = Object.entries(results.subjectStats)
            .map(([subject, stats]) => ({
                subject,
                accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
            }))
            .sort((a, b) => a.accuracy - b.accuracy);
        
        return subjectPerformance.slice(0, 3).map(item => item.subject);
    }
}

// ==================== STUDY PLAN DISPLAY ====================
class StudyPlanDisplay {
    static show(studyPlan) {
        this.showChartLoaders(['dailyLoader', 'weeklyLoader', 'monthlyLoader']);
        
        setTimeout(() => {
            this.displayDailyTimeline(studyPlan.dailySchedule);
            this.hideChartLoader('dailyLoader');
        }, 600);
        
        setTimeout(() => {
            this.displayWeeklyFocus(studyPlan);
            this.hideChartLoader('weeklyLoader');
        }, 1000);
        
        setTimeout(() => {
            this.displayMonthlyGoals(studyPlan.monthlyTargets);
            this.hideChartLoader('monthlyLoader');
        }, 1400);
    }

    static displayDailyTimeline(dailySchedule) {
        const container = document.getElementById('dailyTimeline');
        if (!container) return;
        
        const today = new Date().getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = dayNames[today];
        
        const todaySchedule = dailySchedule.find(day => day.day === todayName) || dailySchedule[0];
        
        container.innerHTML = `
            <div class="timeline-day" style="background: linear-gradient(135deg, rgba(247, 166, 33, 0.1), rgba(247, 166, 33, 0.05)); border-left: 3px solid #F7A621;">
                <h4>📍 Today's Focus - ${todaySchedule.day}</h4>
                ${this.generateTimeSlots(todaySchedule)}
            </div>
            
            <div style="max-height: 200px; overflow-y: auto; margin-top: 15px;">
                ${dailySchedule.filter(day => day.day !== todayName).map(day => `
                    <div class="timeline-day">
                        <h4>${day.day}</h4>
                        ${this.generateTimeSlots(day)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    static generateTimeSlots(daySchedule) {
        // Use AI-generated subjects instead of overriding them
        const subject1 = daySchedule.subjects[0]?.name || 'Study Session 1';
        const subject2 = daySchedule.subjects[1]?.name || 'Study Session 2';
        const subject3 = daySchedule.subjects[2]?.name || subject1;
        
        const timeSlots = [
            { time: '9:00-10:00', subject: subject1, type: 'study' },
            { time: '10:00-11:00', subject: subject2, type: 'study' },
            { time: '11:00-11:15', subject: 'Break', type: 'rest' },
            { time: '11:15-12:15', subject: subject3, type: 'study' },
            { time: '12:15-1:00', subject: 'Lunch Break', type: 'rest' },
            { time: '5:00-6:00', subject: `${subject1} - Concept Review`, type: 'review' },
            { time: '6:00-7:00', subject: 'Evening Break', type: 'rest' }
        ];
        
        return timeSlots.map(slot => `
            <div class="time-slot">
                <span class="time-indicator">${slot.time}</span>
                <span class="subject-tag ${slot.type}">${slot.subject}</span>
            </div>
        `).join('');
    }

    static displayWeeklyFocus(studyPlan) {
        const container = document.getElementById('weeklyFocus');
        if (!container) return;
        
        const results = DataManager.getResults();
        const weeklyFocus = this.generateDynamicWeeklyFocus(results, studyPlan);
        
        const totalHours = weeklyFocus.reduce((sum, item) => sum + item.hours, 0);
        
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="background: rgba(16, 185, 129, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5em; font-weight: bold; color: #10B981;">${totalHours}h</div>
                    <div style="font-size: 0.8em; color: #6c757d;">Total Weekly Study</div>
                </div>
            </div>
            
            ${weeklyFocus.map(item => `
                <div class="weekly-subject">
                    <div class="subject-info">
                        <div class="subject-dot" style="background: ${item.color};"></div>
                        <span style="font-weight: 500; color: #101E3D;">${item.subject}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="subject-hours">${item.hours}h</span>
                        <span class="priority-badge priority-${item.priority}">${item.priority}</span>
                    </div>
                </div>
            `).join('')}
        `;
    }

    static generateDynamicWeeklyFocus(results, studyPlan) {
        // Only use AI-generated study plan - no fallbacks
        if (studyPlan && studyPlan.weeklyFocus && Array.isArray(studyPlan.weeklyFocus) && studyPlan.weeklyFocus.length > 0) {
            return studyPlan.weeklyFocus.map(item => ({
                subject: item.subject,
                hours: item.hours,
                priority: item.priority,
                color: item.color
            }));
        }
        
        // If AI failed, show error message instead of fallback
        return [{
            subject: "AI Study Plan Unavailable",
            hours: 0,
            priority: "high", 
            color: "#EF4444"
        }];
    }

    static generateFromResults(results) {
        const weeklyFocus = [];
        let totalHours = 0;
        
        const subjectColors = this.generateSubjectColorPalette(Object.keys(results.subjectStats));
        
        Object.entries(results.subjectStats).forEach(([subject, stats]) => {
            const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
            let hours, priority, priorityLevel;
            
            if (accuracy < 40) {
                hours = 8;
                priority = 'urgent';
                priorityLevel = 'high';
            } else if (accuracy < 60) {
                hours = 6;
                priority = 'important';
                priorityLevel = 'high';
            } else if (accuracy < 75) {
                hours = 4;
                priority = 'moderate';
                priorityLevel = 'medium';
            } else {
                hours = 3;
                priority = 'maintenance';
                priorityLevel = 'low';
            }
            
            weeklyFocus.push({
                subject: subject,
                hours: hours,
                priority: priorityLevel,
                color: subjectColors[subject],
                accuracy: Math.round(accuracy)
            });
            
            totalHours += hours;
        });
        
        weeklyFocus.sort((a, b) => a.accuracy - b.accuracy);
        
        if (totalHours > 25) {
            const scaleFactor = 25 / totalHours;
            weeklyFocus.forEach(item => {
                item.hours = Math.max(2, Math.round(item.hours * scaleFactor));
            });
        }
        
        weeklyFocus.push({
            subject: 'Mock Tests & Practice',
            hours: 4,
            priority: 'high',
            color: '#8B5CF6'
        });
        
        return weeklyFocus;
    }

    static getPrioritySubjectsForDay(results) {
        if (!results || !results.subjectStats) {
            // Fallback to exam data subjects if no results
            if (examState.examData && examState.examData.length > 0) {
                const subjectCounts = {};
                examState.examData.forEach(question => {
                    const subject = question.classification?.subject;
                    if (subject) {
                        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
                    }
                });
                return Object.keys(subjectCounts).slice(0, 3);
            }
            return ['Mathematics', 'Science', 'General Knowledge'];
        }
        
        // Get subjects sorted by performance (worst first for priority focus)
        const subjectPerformance = Object.entries(results.subjectStats)
            .map(([subject, stats]) => ({
                subject,
                accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
            }))
            .sort((a, b) => a.accuracy - b.accuracy);
        
        return subjectPerformance.slice(0, 3).map(item => item.subject);
    }

    static generateSubjectColorPalette(subjects) {
        const colors = [
            '#6366f1', '#10B981', '#F7A621', '#EF4444', '#8B5CF6', 
            '#14B8A6', '#F59E0B', '#EC4899', '#6B7280', '#3B82F6',
            '#84CC16', '#F97316', '#06B6D4', '#8B5A2B', '#DC2626',
            '#7C3AED', '#059669', '#CA8A04', '#BE185D', '#4B5563'
        ];
        
        const subjectColorMap = {};
        
        subjects.forEach((subject, index) => {
            subjectColorMap[subject] = colors[index % colors.length];
        });
        
        return subjectColorMap;
    }

    static generateSubjectColor(subject) {
        const allSubjects = this.extractSubjectsFromExamData();
        const subjectIndex = allSubjects.indexOf(subject);
        
        const colors = [
            '#6366f1', '#10B981', '#F7A621', '#EF4444', '#8B5CF6', 
            '#14B8A6', '#F59E0B', '#EC4899', '#6B7280', '#3B82F6',
            '#84CC16', '#F97316', '#06B6D4', '#8B5A2B', '#DC2626',
            '#7C3AED', '#059669', '#CA8A04', '#BE185D', '#4B5563'
        ];
        
        return subjectIndex >= 0 ? colors[subjectIndex % colors.length] : '#8B5CF6';
    }

    static extractSubjectsFromExamData() {
        if (!examState.examData || examState.examData.length === 0) {
            return [];
        }
        
        const subjects = new Set();
        examState.examData.forEach(question => {
            if (question.classification && question.classification.subject) {
                subjects.add(question.classification.subject);
            }
        });
        
        return Array.from(subjects).sort();
    }

    static displayMonthlyGoals(monthlyTargets) {
        const container = document.getElementById('monthlyGoals');
        if (!container) return;
        
        container.innerHTML = `
            <div class="monthly-grid">
                ${monthlyTargets.map(week => `
                    <div class="monthly-week">
                        <div class="week-number">Week ${week.week}</div>
                        <div class="week-target">${week.target}</div>
                        <div class="week-hours">${week.hours}h</div>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; text-align: center;">
                <div style="font-size: 0.9em; color: #6366f1; font-weight: 500;">
                    🎯 Monthly Total: ${monthlyTargets.reduce((sum, week) => sum + week.hours, 0)} hours of focused learning
                </div>
            </div>
        `;
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

// ==================== GROWTH DISPLAY ====================
class GrowthDisplay {
    static show(results) {
        this.showChartLoaders(['radarLoader', 'gaugeLoader', 'matrixLoader']);
        
        const growthData = this.calculateGrowthMetrics(results);
        
        setTimeout(() => {
            this.createSkillsRadar(growthData.skillsData);
            this.hideChartLoader('radarLoader');
        }, 800);
        
        setTimeout(() => {
            this.createProgressGauge(growthData.currentScore, growthData.targetScore);
            this.hideChartLoader('gaugeLoader');
        }, 1200);
        
        setTimeout(() => {
            this.createPriorityMatrix(growthData.priorityData);
            this.hideChartLoader('matrixLoader');
        }, 1600);
    }

    static calculateGrowthMetrics(results) {
        const subjects = Object.entries(results.subjectStats);
        const skillsData = {
            labels: subjects.map(([subject]) => subject.length > 15 ? subject.substring(0, 15) + '...' : subject),
            datasets: [{
                label: 'Current Level',
                data: subjects.map(([_, stats]) => Math.round((stats.correct / stats.total) * 100)),
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderColor: '#10B981',
                borderWidth: 2,
                pointBackgroundColor: '#10B981'
            }, {
                label: 'Target Level',
                data: subjects.map(() => 85),
                backgroundColor: 'rgba(247, 166, 33, 0.1)',
                borderColor: '#F7A621',
                borderWidth: 2,
                borderDash: [5, 5],
                pointBackgroundColor: '#F7A621'
            }]
        };

        const priorityData = subjects.map(([subject, stats]) => {
            const score = Math.round((stats.correct / stats.total) * 100);
            let priority = 'nice';
            let priorityTitle = 'Good Progress';
            
            if (score < 40) {
                priority = 'urgent';
                priorityTitle = 'Needs Immediate Focus';
            } else if (score < 70) {
                priority = 'important';
                priorityTitle = 'Requires Attention';
            }
            
            return {
                subject: subject,
                score,
                priority,
                priorityTitle
            };
        });

        return {
            skillsData,
            currentScore: results.score,
            targetScore: 95,
            priorityData
        };
    }

    static createSkillsRadar(skillsData) {
        const ctx = document.getElementById('skillsRadarChart');
        if (!ctx) return;
        
        try {
            examState.skillsRadarChart = new Chart(ctx, {
                type: 'radar',
                data: skillsData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { size: 10 } }
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { display: false },
                            grid: { color: 'rgba(0,0,0,0.1)' },
                            pointLabels: { font: { size: 10 } }
                        }
                    }
                }
            });
            
            const legendContainer = document.getElementById('radarLegend');
            if (legendContainer) {
                legendContainer.innerHTML = `
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #10B981;"></div>
                        <span>Current Level</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #F7A621;"></div>
                        <span>Target Level</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Radar chart error:', error);
            ctx.parentElement.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 40px;">Radar chart unavailable</div>';
        }
    }

    static createProgressGauge(currentScore, targetScore) {
        const ctx = document.getElementById('progressGauge');
        if (!ctx) return;
        
        try {
            examState.progressGaugeChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [currentScore, Math.max(0, targetScore - currentScore), Math.max(0, 100 - targetScore)],
                        backgroundColor: ['#F7A621', '#e9ecef', '#f8f9fa'],
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
            
            const gaugeInfo = document.getElementById('gaugeInfo');
            if (gaugeInfo) {
                const progressMessage = currentScore >= targetScore ? 
                    '🎉 Target Achieved!' : 
                    `${Math.round(targetScore - currentScore)}% to go!`;
                    
                gaugeInfo.innerHTML = `
                    <div class="current-score">${currentScore}%</div>
                    <div class="target-score">Target: ${targetScore}%</div>
                    <div class="progress-message">${progressMessage}</div>
                `;
            }
        } catch (error) {
            console.error('Gauge chart error:', error);
            ctx.parentElement.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 40px;">Progress gauge unavailable</div>';
        }
    }

    static createPriorityMatrix(priorityData) {
        const container = document.getElementById('priorityMatrix');
        if (!container) return;
        
        container.innerHTML = `
            <div class="priority-matrix">
                ${priorityData.map(item => `
                    <div class="priority-item priority-${item.priority}" onclick="showSubjectDetails('${item.subject.replace(/'/g, "\\'")}', ${item.score})" style="cursor: pointer; transition: transform 0.2s ease;">
                        <div class="priority-title">${item.priorityTitle}</div>
                        <div class="priority-subject">${item.subject}</div>
                        <div class="priority-score score-${item.score < 40 ? 'low' : item.score < 70 ? 'medium' : 'high'}">
                            ${item.score}%
                        </div>
                        <div style="font-size: 0.7em; color: #6c757d; margin-top: 5px;">
                            👆 Tap for details
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
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

// ==================== REVIEW MANAGER ====================
class ReviewManager {
    static show() {
        Utils.switchInterface(SELECTORS.RESULTS_INTERFACE, SELECTORS.REVIEW_INTERFACE);
        this.generate();
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 100);
    }

    static generate() {
        const results = DataManager.getResults();
        const reviewContainer = document.getElementById('reviewContainer');
        if (!reviewContainer) return;
        
        reviewContainer.innerHTML = '';

        examState.examData.forEach((question, index) => {
            const userAnswer = examState.answers[index];
            const correctAnswer = question.correct_answer;
            const isCorrect = userAnswer === correctAnswer;
            const isAnswered = userAnswer !== undefined;

            const reviewDiv = document.createElement('div');
            reviewDiv.className = 'review-question';

            let statusClass = 'unanswered';
            let statusText = 'Not Attempted';
            
            if (isAnswered) {
                statusClass = isCorrect ? 'correct' : 'incorrect';
                statusText = isCorrect ? '✓ Correct' : '✗ Incorrect';
            }

            reviewDiv.innerHTML = `
                <div class="question-header">
                    <span class="question-number">Question ${index + 1}</span>
                    <span class="answer-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="question-text">${question.Question}</div>
                
                <div class="options options-spacing">
                    ${Object.entries(question.options).map(([key, value]) => {
                        let optionClass = '';
                        let optionPrefix = '';
                        
                        if (key === correctAnswer) {
                            optionClass = 'style="background: #d4edda; border-color: #28a745; color: #155724;"';
                            optionPrefix = '✓ ';
                        } else if (key === userAnswer && !isCorrect) {
                            optionClass = 'style="background: #f8d7da; border-color: #dc3545; color: #721c24;"';
                            optionPrefix = '✗ ';
                        }
                        
                        return `<div class="option" ${optionClass}>
                            <span><strong>${key.toUpperCase()}.</strong> ${optionPrefix}${value}</span>
                        </div>`;
                    }).join('')}
                </div>

                ${isAnswered ? `<p><strong>Your Answer:</strong> ${userAnswer ? userAnswer.toUpperCase() : 'None'}</p>` : ''}
                <p><strong>Correct Answer:</strong> ${correctAnswer.toUpperCase()}</p>

                <div class="solution-section">
                    <h4>💡 Solution</h4>
                    <p>${question.Solution}</p>
                </div>

                ${question.step_by_step ? `
                <div class="steps-section">
                    <h4>📋 Step-by-Step Approach</h4>
                    ${question.step_by_step.map((step, i) => 
                        `<div class="step-item"><strong>Step ${i + 1}:</strong> ${step}</div>`
                    ).join('')}
                </div>
                ` : ''}

                ${question.tips_and_tricks ? `
                <div class="tips-section">
                    <h4>💯 Tips & Tricks</h4>
                    ${question.tips_and_tricks.map(tip => 
                        `<div class="tip-item">• ${tip}</div>`
                    ).join('')}
                </div>
                ` : ''}

                <div class="review-meta">
                    <strong>Topic:</strong> ${Utils.buildTopicHierarchy(question.classification)}<br>
                    <strong>Difficulty:</strong> ${question.difficulty_level}
                </div>
            `;

            reviewContainer.appendChild(reviewDiv);
        });
    }

    static backToResults() {
        Utils.switchInterface(SELECTORS.REVIEW_INTERFACE, SELECTORS.RESULTS_INTERFACE);
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 100);
    }
}

// ==================== EMAIL VERIFICATION ====================
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
            button.textContent = '🔍 Verify & Start Exam';
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
                
                sessionStorage.setItem('examAccessVerified', 'true');
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

    static proceedToExam() {
        this.hideRegistrationModal();
        
        setTimeout(() => {
            ExamInterface.show();
        }, 100);
    }
}

// ==================== EXAM INTERFACE ====================
class ExamInterface {
    static async show() {
        const heroSection = document.querySelector('.text-center.mb-12 h1, .text-center h1[class*="text-"]');
        const testSection = heroSection ? heroSection.closest('.container.mx-auto') : null;
        const isEmailVerificationFlow = testSection && testSection.style.display !== 'none';
        
        if (isEmailVerificationFlow) {
            testSection.style.display = 'none';
            
            const examContainer = document.getElementById('examContainer');
            if (examContainer) {
                examContainer.className = 'container';
                examContainer.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; width: 100% !important; max-width: 100% !important;';
            }
            
            Utils.hideElement('loading');
            
            const examInterface = document.getElementById('examInterface');
            if (examInterface) {
                examInterface.classList.remove('hidden');
            }
            
            await AppController.initialize();
            
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }, 200);
        } else {
            Utils.switchInterface(SELECTORS.LOADING, SELECTORS.EXAM_INTERFACE);
            
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }, 100);
        }
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
            Utils.handleError('Failed to initialize exam', error);
        }
    }

    static setupNavigation() {
        QuestionManager.createNavigation();
        QuestionManager.load(0);
    }

    static setupEventListeners() {
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

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    static submitExam() {
        if (Object.keys(examState.answers).length < examState.examData.length) {
            if (!confirm('You have not answered all questions. Are you sure you want to submit?')) {
                return;
            }
        }
        
        TimerManager.stop();
        const results = ResultsCalculator.calculate();
        ResultsDisplay.show();
    }

    static restartExam() {
        DataManager.clearAllData();
        examState.reset();
        this.resetUI();
        this.clearAIInsights();

        TimerManager.hideTimer();
        
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

    static resetUI() {
        const subjectBreakdown = document.getElementById('subjectBreakdown');
        if (subjectBreakdown && subjectBreakdown.parentElement) {
            subjectBreakdown.parentElement.style.display = 'block';
        }
    }

    static clearAIInsights() {
        const aiInsightContainer = document.getElementById('aiPerformanceInsight');
        if (aiInsightContainer) {
            aiInsightContainer.innerHTML = '<p>Analyzing your unique learning patterns...</p><div class="insight-loader"></div>';
        }
        
        const chartContainers = [
            'skillsRadarChart', 'progressGauge', 'priorityMatrix',
            'dailyTimeline', 'weeklyFocus', 'monthlyGoals'
        ];
        
        chartContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '';
        });
    }

    static downloadResults() {
        const results = DataManager.getResults();
        if (!results) return;
        
        const dataStr = JSON.stringify(results, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `exam-results-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }
}

// ==================== START TEST FUNCTION ====================
function startExamTest() {
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

// ==================== MODAL FUNCTIONS ====================
function showSubjectDetails(subject, subjectScore) {
    const results = DataManager.getResults();
    if (!results) return;
    
    const subjectQuestions = examState.examData.filter(q => q.classification.subject === subject);
    const hierarchicalData = {};
    
    subjectQuestions.forEach((question, idx) => {
        const globalIndex = examState.examData.findIndex(q => q.question_id === question.question_id);
        const userAnswer = examState.answers[globalIndex];
        const isCorrect = userAnswer === question.correct_answer;
        const isAttempted = userAnswer !== undefined;
        
        const subtopic = question.classification.subtopic || 'General';
        const subSubtopic = question.classification.sub_subtopic || 'General';
        const concept = question.classification.concept || 'General Concept';
        
        if (!hierarchicalData[subtopic]) {
            hierarchicalData[subtopic] = {
                stats: { total: 0, correct: 0, attempted: 0 },
                subSubtopics: {}
            };
        }
        
        if (!hierarchicalData[subtopic].subSubtopics[subSubtopic]) {
            hierarchicalData[subtopic].subSubtopics[subSubtopic] = {
                stats: { total: 0, correct: 0, attempted: 0 },
                concepts: {}
            };
        }
        
        if (!hierarchicalData[subtopic].subSubtopics[subSubtopic].concepts[concept]) {
            hierarchicalData[subtopic].subSubtopics[subSubtopic].concepts[concept] = {
                total: 0, correct: 0, attempted: 0
            };
        }
        
        hierarchicalData[subtopic].stats.total++;
        hierarchicalData[subtopic].subSubtopics[subSubtopic].stats.total++;
        hierarchicalData[subtopic].subSubtopics[subSubtopic].concepts[concept].total++;
        
        if (isAttempted) {
            hierarchicalData[subtopic].stats.attempted++;
            hierarchicalData[subtopic].subSubtopics[subSubtopic].stats.attempted++;
            hierarchicalData[subtopic].subSubtopics[subSubtopic].concepts[concept].attempted++;
        }
        
        if (isCorrect) {
            hierarchicalData[subtopic].stats.correct++;
            hierarchicalData[subtopic].subSubtopics[subSubtopic].stats.correct++;
            hierarchicalData[subtopic].subSubtopics[subSubtopic].concepts[concept].correct++;
        }
    });
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.6); z-index: 1000; display: flex; 
        align-items: center; justify-content: center; padding: 15px;
        animation: fadeIn 0.3s ease;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white; border-radius: 12px; padding: 20px; 
        max-width: 90vw; width: 100%; max-width: 500px; max-height: 85vh; 
        overflow-y: auto; position: relative; 
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    `;
    
    content.innerHTML = `
        <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .detail-section { margin-bottom: 20px; }
            .detail-item { 
                display: flex; justify-content: space-between; align-items: flex-start;
                padding: 8px 12px; margin: 6px 0; background: #f8f9fa; 
                border-radius: 6px; border-left: 3px solid #dee2e6;
                font-size: 0.85em; line-height: 1.4; gap: 8px;
            }
            .detail-item .item-text {
                flex: 1; word-wrap: break-word; overflow-wrap: break-word;
                hyphens: auto; line-height: 1.4;
            }
            .detail-item.good { border-left-color: #10B981; background: #f0fdf4; }
            .detail-item.average { border-left-color: #F7A621; background: #fffbeb; }
            .detail-item.poor { border-left-color: #EF4444; background: #fef2f2; }
            .detail-score { font-weight: bold; min-width: 45px; text-align: right; }
            .detail-score.good { color: #10B981; }
            .detail-score.average { color: #F7A621; }
            .detail-score.poor { color: #EF4444; }
        </style>
        
        <button onclick="this.closest('[style*=fixed]').remove()" 
                style="position: absolute; top: 15px; right: 15px; background: none; 
                border: none; font-size: 20px; cursor: pointer; color: #999; 
                width: 28px; height: 28px; border-radius: 50%; display: flex; 
                align-items: center; justify-content: center;">✕</button>
        
        <h3 style="margin-bottom: 15px; color: #101E3D; padding-right: 35px; font-size: 1.1em;">
            📊 ${subject} Analysis
        </h3>
        
        <div style="background: linear-gradient(135deg, #F7A621, #E69A0C); 
                    color: white; padding: 12px; border-radius: 8px; 
                    text-align: center; margin-bottom: 20px;">
            <div style="font-size: 1.4em; font-weight: bold;">${subjectScore}%</div>
            <div style="font-size: 0.8em; opacity: 0.9;">Overall Subject Score</div>
        </div>
        
        ${generateHierarchicalDisplay(hierarchicalData)}
        
        <div style="margin-top: 20px; padding: 12px; background: #e6f3ff; 
                    border-radius: 6px; font-size: 0.8em; color: #1e40af;">
            💡 Focus on areas below 70% for maximum improvement
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function generateHierarchicalDisplay(hierarchicalData) {
    const entries = Object.entries(hierarchicalData);
    if (entries.length === 0) return '<div style="color: #6c757d;">No detailed data available</div>';
    
    return `
        <div class="detail-section">
            ${entries.map(([subtopic, subtopicData]) => {
                const subtopicPercentage = subtopicData.stats.attempted > 0 ? 
                    Math.round((subtopicData.stats.correct / subtopicData.stats.attempted) * 100) : 0;
                const subtopicClass = subtopicPercentage >= 70 ? 'good' : subtopicPercentage >= 40 ? 'average' : 'poor';
                
                return `
                    <div style="margin-bottom: 20px; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden;">
                        <div class="detail-item ${subtopicClass}" style="margin: 0; border-radius: 0; border-left: none; border-left: 4px solid ${subtopicClass === 'good' ? '#10B981' : subtopicClass === 'average' ? '#F7A621' : '#EF4444'};">
                            <span class="item-text" style="font-weight: 600;">📚 ${subtopic}</span>
                            <span class="detail-score ${subtopicClass}">
                                ${subtopicData.stats.correct}/${subtopicData.stats.attempted || subtopicData.stats.total}
                                ${subtopicData.stats.attempted > 0 ? ` (${subtopicPercentage}%)` : ''}
                            </span>
                        </div>
                        
                        <div style="padding: 0 0 0 15px;">
                            ${Object.entries(subtopicData.subSubtopics).map(([subSubtopic, subSubtopicData]) => {
                                const subSubtopicPercentage = subSubtopicData.stats.attempted > 0 ? 
                                    Math.round((subSubtopicData.stats.correct / subSubtopicData.stats.attempted) * 100) : 0;
                                const subSubtopicClass = subSubtopicPercentage >= 70 ? 'good' : subSubtopicPercentage >= 40 ? 'average' : 'poor';
                                
                                return `
                                    <div style="border-top: 1px solid #f1f3f4;">
                                        <div class="detail-item ${subSubtopicClass}" style="margin: 0; border-radius: 0; border-left: none; background: #f8f9fa; font-size: 0.8em;">
                                            <span class="item-text" style="font-weight: 500;">↳ 🔍 ${subSubtopic}</span>
                                            <span class="detail-score ${subSubtopicClass}">
                                                ${subSubtopicData.stats.correct}/${subSubtopicData.stats.attempted || subSubtopicData.stats.total}
                                                ${subSubtopicData.stats.attempted > 0 ? ` (${subSubtopicPercentage}%)` : ''}
                                            </span>
                                        </div>
                                        
                                        <div style="padding-left: 15px; background: #fafbfc;">
                                            ${Object.entries(subSubtopicData.concepts).map(([concept, conceptData]) => {
                                                const conceptPercentage = conceptData.attempted > 0 ? 
                                                    Math.round((conceptData.correct / conceptData.attempted) * 100) : 0;
                                                const conceptClass = conceptPercentage >= 70 ? 'good' : conceptPercentage >= 40 ? 'average' : 'poor';
                                                
                                                return `
                                                    <div class="detail-item ${conceptClass}" style="margin: 0; border-radius: 0; border-left: none; background: transparent; font-size: 0.75em; padding: 6px 12px;">
                                                        <span class="item-text" style="color: #6c757d;">⤷ 💡 ${concept}</span>
                                                        <span class="detail-score ${conceptClass}">
                                                            ${conceptData.correct}/${conceptData.attempted || conceptData.total}
                                                            ${conceptData.attempted > 0 ? ` (${conceptPercentage}%)` : ''}
                                                        </span>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function showAllTopics() {
    const results = DataManager.getResults();
    if (!results) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        align-items: center; justify-content: center; padding: 20px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white; border-radius: 10px; padding: 25px; 
        max-width: 650px; width: 100%; max-height: 80vh; overflow-y: auto; 
        position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;
    
    const sortedTopics = Object.entries(results.topicStats)
        .map(([topic, stats]) => ({
            topic,
            correct: stats.correct,
            total: stats.total,
            percentage: Math.round((stats.correct / stats.total) * 100)
        }))
        .sort((a, b) => b.percentage - a.percentage);
    
    let allTopicsHtml = '<h3 style="margin-bottom: 20px; color: #101E3D; padding-right: 30px;">All Topics Breakdown</h3>';
    
    sortedTopics.forEach(topic => {
        const color = topic.percentage >= 70 ? '#10B981' : topic.percentage >= 40 ? '#6C757D' : '#EF4444';
        allTopicsHtml += `
            <div style="padding: 12px 8px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 14px;">${topic.topic}</span>
                    <span style="font-weight: bold; color: ${color}; font-size: 14px;">
                        ${topic.correct}/${topic.total} (${topic.percentage}%)
                    </span>
                </div>
                <div class="subject-bar">
                    <div class="subject-progress" style="width: ${Math.max(topic.percentage, 5)}%; background: ${color};"></div>
                </div>
            </div>
        `;
    });
    
    content.innerHTML = allTopicsHtml + `
        <button onclick="this.closest('[style*=fixed]').remove()" 
                style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #999; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">×</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ==================== GLOBAL FUNCTION BINDINGS ====================
// These functions need to be available globally for onclick handlers
window.nextQuestion = () => QuestionManager.next();
window.previousQuestion = () => QuestionManager.previous();
window.submitExam = () => AppController.submitExam();
window.showDetailedReview = () => ReviewManager.show();
window.showReview = () => ReviewManager.show();
window.backToResults = () => ReviewManager.backToResults();
window.downloadResults = () => AppController.downloadResults();
window.restartExam = () => AppController.restartExam();
window.showAllTopics = () => showAllTopics();
window.initiateExamAccess = () => EmailVerification.showVerificationModal();
window.hideEmailVerificationModal = () => EmailVerification.hideVerificationModal();
window.showRegistrationFromError = () => {
    EmailVerification.hideVerificationModal();
    EmailVerification.showRegistrationModal();
};
window.showRegistrationModal = () => EmailVerification.showRegistrationModal();
window.hideRegistrationModal = () => EmailVerification.hideRegistrationModal();
window.submitRegistrationForm = (event) => EmailVerification.submitRegistration(event);
window.proceedToExamAfterRegistration = () => EmailVerification.proceedToExam();
window.clearCurrentAnswer = () => QuestionManager.clearCurrentAnswer();
window.startExamTest = startExamTest;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    EmailVerification.initialize();
});

// ==================== CONFIGURATION UPDATER ====================
// Function to update configuration after HTML loads
window.updateExamConfig = function(newConfig) {
    Object.assign(CONFIG, newConfig);
};