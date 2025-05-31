const CONFIG = {
    TIMER_INTERVAL: 1000,
    SCORE_THRESHOLDS: { EXCELLENT: 80, GOOD: 60, AVERAGE: 40 },
    MARKING_SCHEME: { CORRECT: 1, INCORRECT: -0.25, UNATTEMPTED: 0 }
};

const SELECTORS = {
    LOADING: 'loading',
    EXAM_INTERFACE: 'examInterface', 
    RESULTS_INTERFACE: 'resultsInterface',
    REVIEW_INTERFACE: 'reviewInterface',
    QUESTION_LIST: 'questionList',
    TIMER: 'timer'
};

const DISPLAY_LIMITS = {
    MAX_TOPICS_PREVIEW: 4,
    MAX_CONCEPTS: 5,
    TOPIC_NAME_LENGTH: 40,
    MAX_TOPICS_MODAL: 12
};

const GEMINI_CONFIG = {
    API_KEY: 'AIzaSyBr38XKvBXOz4eN8r9lkEuj2izj4Ag_zsg',
    MODEL: 'gemini-2.5-pro-preview-05-06',
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/'
};

let geminiClient = null;

const PERFORMANCE_LEVELS = {
    EXCELLENT: 'Excellent',
    GOOD: 'Good', 
    AVERAGE: 'Average',
    NEEDS_IMPROVEMENT: 'Needs Improvement'
};
// Global variables
let examData = [];
let currentQuestion = 0;
let answers = {};
let startTime = null;
let timerInterval = null;
let examDuration = 0;

// Sample exam data (replace with your JSON file)
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
            "subject": "Uttarakhand GK",
            "topic": "History of Uttarakhand",
            "subtopic": "Ancient Dynasties of Uttarakhand",
            "sub_subtopic": "Kuninda Dynasty",
            "concept": "Identifying the capital city of the Kuninda Dynasty based on historical and archaeological evidence."
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
            "subject": "Uttarakhand GK", 
            "topic": "People's Movements in Uttarakhand",
            "subtopic": "Environmental Movements",
            "sub_subtopic": "Chipko Movement",
            "concept": "Identifying the geographical origin (district) of the Chipko Movement."
        },
        "difficulty_level": "Easy",
        "blooms_taxonomy": "Remembering"
    }
];

// Utility functions
function hideElement(id) { 
    document.getElementById(id).classList.add('hidden'); 
}

function showElement(id) { 
    document.getElementById(id).classList.remove('hidden'); 
}

function switchInterface(hideId, showId) {
    hideElement(hideId);
    showElement(showId);
}

// Initialize the application
async function initializeApp() {
    try {
        await loadExamData();
        initializeTimer();
        setupNavigation();
        showExamInterface();
    } catch (error) {
        handleError('Failed to initialize exam', error);
    }
}

async function loadExamData() {
    try {
        const response = await fetch('exam-data.json');
        if (response.ok) {
            examData = await response.json();
        } else {
            throw new Error('File not found');
        }
    } catch (error) {
        console.log('Using sample data');
        examData = sampleExamData;
    }
    
    if (!examData || examData.length === 0) {
        throw new Error('No exam data available');
    }
}

function initializeTimer() {
    startTime = new Date();
    startTimer();
}

function setupNavigation() {
    createQuestionNavigation();
    loadQuestion(0);
}

function handleError(message, error) {
    console.error(message, error);
    document.getElementById('loading').innerHTML = 
        `<h2>Error</h2><p>${message}. Please refresh and try again.</p>`;
}

function showExamInterface() {
    switchInterface(SELECTORS.LOADING, SELECTORS.EXAM_INTERFACE);
}

function startTimer() {
    timerInterval = setInterval(updateTimer, CONFIG.TIMER_INTERVAL);
}

function updateTimer() {
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('timer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function createQuestionNavigation() {
    const questionList = document.getElementById('questionList');
    questionList.innerHTML = '';
    
    examData.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.className = 'question-nav-btn';
        btn.textContent = index + 1;
        btn.onclick = () => loadQuestion(index);
        if (index === 0) btn.classList.add('current');
        questionList.appendChild(btn);
    });
}

function updateQuestionNavigation() {
    const buttons = document.querySelectorAll('.question-nav-btn');
    buttons.forEach((btn, index) => {
        btn.classList.remove('current');
        if (index === currentQuestion) {
            btn.classList.add('current');
        }
        if (answers[index] !== undefined) {
            btn.classList.add('answered');
        }
    });
}

function loadQuestion(index) {
    currentQuestion = index;
    const question = examData[index];
    
    document.getElementById('questionNumber').textContent = `Question ${index + 1} of ${examData.length}`;
    document.getElementById('questionMeta').textContent = `${question.classification.subject} | ${question.difficulty_level}`;
    document.getElementById('questionText').textContent = question.Question;
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    Object.entries(question.options).forEach(([key, value]) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.onclick = () => selectOption(key);
        
        const isSelected = answers[index] === key;
        if (isSelected) optionDiv.classList.add('selected');
        
        optionDiv.innerHTML = `
            <input type="radio" name="option" value="${key}" ${isSelected ? 'checked' : ''}>
            <span><strong>${key.toUpperCase()}.</strong> ${value}</span>
        `;
        
        // Prevent radio button from interfering with div click (AFTER innerHTML is set)
        const radioInput = optionDiv.querySelector('input[type="radio"]');
        radioInput.onclick = (e) => e.preventDefault();
        
        optionsContainer.appendChild(optionDiv);
    });
    
    // Update navigation buttons
    document.getElementById('prevBtn').style.display = index === 0 ? 'none' : 'block';
    document.getElementById('nextBtn').style.display = index === examData.length - 1 ? 'none' : 'block';
    document.getElementById('submitBtn').style.display = index === examData.length - 1 ? 'block' : 'none';
    
    updateQuestionNavigation();
}

function selectOption(option) {
    answers[currentQuestion] = option;
    
    // Update UI
    const options = document.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    // Update radio buttons
    const radioButtons = document.querySelectorAll('.option input[type="radio"]');
    radioButtons.forEach(radio => radio.checked = false);
    
    const selectedOption = document.querySelector(`.option input[value="${option}"]`).parentElement;
    selectedOption.classList.add('selected');
    selectedOption.querySelector('input[type="radio"]').checked = true;
    
    updateQuestionNavigation();
}

function nextQuestion() {
    if (currentQuestion < examData.length - 1) {
        loadQuestion(currentQuestion + 1);
    }
}

function previousQuestion() {
    if (currentQuestion > 0) {
        loadQuestion(currentQuestion - 1);
    }
}

function submitExam() {
    if (Object.keys(answers).length < examData.length) {
        if (!confirm('You have not answered all questions. Are you sure you want to submit?')) {
            return;
        }
    }
    
    clearInterval(timerInterval);
    examDuration = Math.floor((new Date() - startTime) / 1000);
    
    calculateResults();
    showResults();
}

function calculateResults() {
    const basicStats = calculateBasicStats();
    const analytics = calculateAnalytics();
    const results = buildResultsObject(basicStats, analytics);
    storeResults(results);
    return results;
}

function calculateBasicStats() {
    let correct = 0, incorrect = 0, unattempted = 0, totalMarks = 0;
    
    examData.forEach((question, index) => {
        const userAnswer = answers[index];
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

function calculateAnalytics() {
    const analytics = {
        subjectStats: {},
        topicStats: {},
        difficultyStats: {},
        bloomsStats: {},
        conceptStats: {}
    };
    
    examData.forEach((question, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === question.correct_answer;
        
        // Update all analytics
        updateStatCategory(analytics.subjectStats, question.classification.subject, isCorrect);
        updateStatCategory(analytics.topicStats, question.classification.topic, isCorrect);
        updateStatCategory(analytics.difficultyStats, question.difficulty_level, isCorrect);
        updateStatCategory(analytics.bloomsStats, question.blooms_taxonomy, isCorrect);
        updateStatCategory(analytics.conceptStats, question.classification.concept, isCorrect);
    });
    
    return analytics;
}

function updateStatCategory(statsObject, category, isCorrect) {
    if (!statsObject[category]) {
        statsObject[category] = { total: 0, correct: 0 };
    }
    statsObject[category].total++;
    if (isCorrect) statsObject[category].correct++;
}

function buildResultsObject(basicStats, analytics) {
    return {
        score: Math.round((basicStats.correct / examData.length) * 100),
        totalMarks: basicStats.totalMarks,
        maxMarks: examData.length,
        correct: basicStats.correct,
        incorrect: basicStats.incorrect,
        unattempted: basicStats.unattempted,
        total: examData.length,
        duration: examDuration,
        ...analytics,
        answers: answers,
        timestamp: new Date().toISOString()
    };
}

function storeResults(results) {
    localStorage.setItem('examResults', JSON.stringify(results));
}

function getPerformanceLevel(score) {
    if (score >= CONFIG.SCORE_THRESHOLDS.EXCELLENT) return PERFORMANCE_LEVELS.EXCELLENT;
    if (score >= CONFIG.SCORE_THRESHOLDS.GOOD) return PERFORMANCE_LEVELS.GOOD;
    if (score >= CONFIG.SCORE_THRESHOLDS.AVERAGE) return PERFORMANCE_LEVELS.AVERAGE;
    return PERFORMANCE_LEVELS.NEEDS_IMPROVEMENT;
}

function showResults() {
    const results = JSON.parse(localStorage.getItem('examResults'));
    
    switchInterface(SELECTORS.EXAM_INTERFACE, SELECTORS.RESULTS_INTERFACE);
    
    // Show hero section with animation
    displayHeroSection(results);
    
    // Show quick stats
    displayQuickStats(results);
    
    // Show performance matrix
    displayPerformanceMatrix(results);
    
    // Generate real AI insights only
    generateRealAIInsights(results);
}

function displayHeroSection(results) {
    // Personalized greeting based on performance
    const greetings = {
        excellent: ["Outstanding performance! 🌟", "Exceptional work, Achiever!", "You're on fire! 🔥"],
        good: ["Great job, Champion! 🏆", "Solid performance! 💪", "You're improving steadily! 📈"],
        average: ["Good effort! Keep going! 🚀", "You're on the right track! ✨", "Progress in motion! 🎯"],
        poor: ["Every expert was once a beginner! 🌱", "Growth mindset activated! 💡", "Your journey starts here! 🎯"]
    };
    
    const performance = getPerformanceLevel(results.score);
    const category = performance === PERFORMANCE_LEVELS.EXCELLENT ? 'excellent' :
                    performance === PERFORMANCE_LEVELS.GOOD ? 'good' :
                    performance === PERFORMANCE_LEVELS.AVERAGE ? 'average' : 'poor';
    
    const randomGreeting = greetings[category][Math.floor(Math.random() * greetings[category].length)];
    
    document.getElementById('personalizedGreeting').textContent = randomGreeting;
    document.getElementById('heroSubtext').textContent = `${results.correct}/${results.total} questions mastered • ${formatTime(results.duration)} spent learning`;
    
    // Animate score circle
    animateScoreCircle(results.score);
}

function animateScoreCircle(score) {
    const circle = document.getElementById('scoreProgress');
    const scoreText = document.querySelector('#scoreCircle .score-text span');
    
    const circumference = 2 * Math.PI * 50; // radius is 50
    const offset = circumference - (score / 100) * circumference;
    
    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
        
        // Animate score counting
        let currentScore = 0;
        const increment = score / 30; // 30 frames for smooth animation
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

function displayQuickStats(results) {
    document.getElementById('correctCount').textContent = results.correct;
    document.getElementById('timeTaken').textContent = formatTime(results.duration);
    
    // Calculate strong topics with proper logic for small samples
    const topicEntries = Object.entries(results.topicStats);
    const strongTopics = topicEntries.filter(([_, stats]) => {
        const accuracy = stats.correct / stats.total;
        return accuracy >= 0.7 && stats.total > 0;
    }).length;
    
    // Calculate focus areas with proper logic
    const focusAreas = topicEntries.filter(([_, stats]) => {
        const accuracy = stats.correct / stats.total;
        return accuracy < 0.5 && stats.total > 0;
    }).length;
    
    document.getElementById('strengthCount').textContent = strongTopics;
    document.getElementById('focusCount').textContent = focusAreas;
    
    // Update stat changes based on actual performance
    updateStatChanges(results, strongTopics, focusAreas);
}

function updateStatChanges(results, strongTopics, focusAreas) {
    const correctChange = document.querySelector('#correctCount').nextElementSibling.nextElementSibling;
    const timeChange = document.querySelector('#timeTaken').nextElementSibling.nextElementSibling;
    const strengthChange = document.querySelector('#strengthCount').nextElementSibling.nextElementSibling;
    const focusChange = document.querySelector('#focusCount').nextElementSibling.nextElementSibling;
    
    // Dynamic messages based on performance
    if (results.score >= 80) {
        correctChange.textContent = 'Excellent work!';
        correctChange.className = 'stat-change positive';
    } else if (results.score >= 60) {
        correctChange.textContent = 'Good progress';
        correctChange.className = 'stat-change positive';
    } else {
        correctChange.textContent = 'Room to improve';
        correctChange.className = 'stat-change improvement';
    }
    
    const avgTime = results.duration / Object.keys(results.answers).length;
    if (avgTime < 60) {
        timeChange.textContent = 'Fast pace';
        timeChange.className = 'stat-change positive';
    } else if (avgTime < 120) {
        timeChange.textContent = 'Steady pace';
        timeChange.className = 'stat-change neutral';
    } else {
        timeChange.textContent = 'Consider speeding up';
        timeChange.className = 'stat-change improvement';
    }
    
    if (strongTopics > 0) {
        strengthChange.textContent = `${strongTopics} areas mastered`;
        strengthChange.className = 'stat-change positive';
    } else {
        strengthChange.textContent = 'Building foundation';
        strengthChange.className = 'stat-change improvement';
    }
    
    if (focusAreas === 0) {
        focusChange.textContent = 'Well balanced';
        focusChange.className = 'stat-change positive';
    } else {
        focusChange.textContent = `${focusAreas} needs attention`;
        focusChange.className = 'stat-change improvement';
    }
}

function displayPerformanceMatrix(results) {
    // Subject Mastery
    displaySubjectMatrix(results.subjectStats);
    
    // Difficulty Progression
    displayDifficultyMatrix(results.difficultyStats);
    
    // Learning Velocity
    displayLearningVelocity(results);
    
    // Knowledge Coverage
    displayKnowledgeCoverage(results);
}

function displaySubjectMatrix(subjectStats) {
    const container = document.getElementById('subjectMatrix');
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

function displayDifficultyMatrix(difficultyStats) {
    const container = document.getElementById('difficultyMatrix');
    const difficulties = ['Easy', 'Moderate', 'Hard'];
    let html = '';
    
    difficulties.forEach(difficulty => {
        const stats = difficultyStats[difficulty];
        if (stats) {
            const percentage = Math.round((stats.correct / stats.total) * 100);
            const color = difficulty === 'Easy' ? '#10B981' : difficulty === 'Moderate' ? '#F7A621' : '#EF4444';
            
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

function displayLearningVelocity(results) {
    const container = document.getElementById('learningVelocity');
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

async function generateRealAIInsights(results) {
    // Initialize Gemini client
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_CONFIG.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: createPerformanceAnalysisPrompt(results)
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Parse the structured response
        const insights = parseAIResponse(aiResponse);
        
        // Display real AI insights
        displayAIInsights(insights);
        
    } catch (error) {
        console.error('Gemini API Error:', error);
        displayAPIError();
    }
}

function createPerformanceAnalysisPrompt(results) {
    const weakTopics = Object.entries(results.topicStats)
        .filter(([_, stats]) => (stats.correct / stats.total) < 0.6)
        .map(([topic, stats]) => `${topic} (${stats.correct}/${stats.total})`);
    
    const strongTopics = Object.entries(results.topicStats)
        .filter(([_, stats]) => (stats.correct / stats.total) >= 0.7)
        .map(([topic, stats]) => `${topic} (${stats.correct}/${stats.total})`);

    // Get detailed question analysis
    const questionAnalysis = examData.map((question, index) => {
        const userAnswer = answers[index];
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
            correct: isCorrect,
            timeProblem: index < Object.keys(results.answers).length
        };
    });

    const attemptedQuestions = questionAnalysis.filter(q => q.attempted);
    const correctQuestions = questionAnalysis.filter(q => q.correct);

    return `Analyze this student's detailed exam performance and provide highly personalized insights in JSON format:

Create a realistic, empathetic study plan that considers:
- Student's current performance level (${results.score}%)
- Include adequate rest time for better retention
- Balance weak areas (60%) with practice (40%)
- Limit daily study to 2-3 hours maximum
- Include motivational messaging
- Consider weekends for deeper study but also rest

COMPREHENSIVE PERFORMANCE DATA:
- Overall Score: ${results.score}% (${results.correct}/${results.total} correct)
- Time Management: ${Math.floor(results.duration / 60)}m ${results.duration % 60}s total, ${Math.round(results.duration / attemptedQuestions.length)}s per question
- Questions Attempted: ${attemptedQuestions.length}/${examData.length}

TOPIC PERFORMANCE:
- Strong Areas: ${strongTopics.join(', ') || 'Building foundation across all areas'}
- Growth Areas: ${weakTopics.join(', ') || 'Maintaining consistent performance'}

SUBJECT BREAKDOWN: ${JSON.stringify(results.subjectStats)}
DIFFICULTY ANALYSIS: ${JSON.stringify(results.difficultyStats)}
BLOOM'S TAXONOMY: ${JSON.stringify(results.bloomsStats)}

DETAILED QUESTION ANALYSIS:
${questionAnalysis.map((q, i) => {
    const hierarchy = [q.subject, q.topic, q.subtopic, q.sub_subtopic, q.concept]
        .filter(item => item && item.trim() !== '')
        .join(' → ');
    return `Q${i+1}: ${hierarchy} | ${q.difficulty} | ${q.blooms} | ${q.attempted ? (q.correct ? 'CORRECT' : 'INCORRECT') : 'NOT_ATTEMPTED'}`;
}).join('\n')}

LEARNING PATTERN ANALYSIS:
- Subject Distribution: ${Object.keys(results.subjectStats).length} different subjects
- Difficulty Comfort Zone: ${Object.entries(results.difficultyStats).map(([diff, stats]) => `${diff}: ${Math.round(stats.correct/stats.total*100)}%`).join(', ')}
- Cognitive Level: ${Object.entries(results.bloomsStats).map(([bloom, stats]) => `${bloom}: ${Math.round(stats.correct/stats.total*100)}%`).join(', ')}

Please respond with ONLY a valid JSON object in this exact format:
{
  "performanceDNA": "Create a 3-4 sentence highly personalized insight about their unique learning DNA, strengths, and cognitive approach based on the detailed question analysis above. Mention specific subjects, difficulty levels, or cognitive patterns.",
  "studyPlan": {
      "dailySchedule": [
        {"day": "Monday", "study": 2.5, "rest": 1.5, "subjects": [{"name": "Uttarakhand GK", "hours": 1.5}, {"name": "Indian Polity", "hours": 1.0}]},
        {"day": "Tuesday", "study": 2.0, "rest": 1.0, "subjects": [{"name": "Practice Tests", "hours": 2.0}]},
        {"day": "Wednesday", "study": 1.5, "rest": 2.0, "subjects": [{"name": "Revision", "hours": 1.5}]},
        {"day": "Thursday", "study": 2.5, "rest": 1.5, "subjects": [{"name": "History", "hours": 1.5}, {"name": "Geography", "hours": 1.0}]},
        {"day": "Friday", "study": 2.0, "rest": 1.0, "subjects": [{"name": "Mock Tests", "hours": 2.0}]},
        {"day": "Saturday", "study": 3.0, "rest": 2.0, "subjects": [{"name": "Comprehensive Study", "hours": 3.0}]},
        {"day": "Sunday", "study": 1.0, "rest": 3.0, "subjects": [{"name": "Light Review", "hours": 1.0}]}
      ],
      "weeklyFocus": [
        {"subject": "Uttarakhand GK", "hours": 6, "priority": "high", "color": "#F7A621"},
        {"subject": "Indian Polity", "hours": 4, "priority": "medium", "color": "#10B981"},
        {"subject": "Practice Tests", "hours": 4, "priority": "high", "color": "#6366f1"}
      ],
      "monthlyTargets": [
        {"week": 1, "target": "Foundation Building", "hours": 15},
        {"week": 2, "target": "Skill Development", "hours": 16},
        {"week": 3, "target": "Practice & Review", "hours": 14},
        {"week": 4, "target": "Final Preparation", "hours": 12}
      ]
    },
  "growthAreas": "Provide 4-5 specific, actionable growth opportunities as HTML with bullet points, directly derived from their performance patterns and question analysis."
}

Base the study plan data on their actual weak areas and performance patterns. Adjust daily hours (1-3 hours), weekly subject focus, and monthly targets according to their specific needs.`;
}

function parseAIResponse(aiResponse) {
    try {
        // Clean the response to extract JSON
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

function displayAIInsights(insights) {
    // Remove loading animations
    removeLoadingAnimations();
    
    // Display Performance DNA with scrollable content
    document.getElementById('aiPerformanceInsight').innerHTML = `<div style="font-size: 0.95em; line-height: 1.6; color: #2d3748;">${insights.performanceDNA}</div>`;
    
    // Display Study Plan with charts
    displayStudyPlanCharts(insights.studyPlan);
    
    // Display Growth Opportunities with charts
    const results = JSON.parse(localStorage.getItem('examResults'));
    displayGrowthOpportunities(results);
}

function displayGrowthOpportunities(results) {
    // Show loaders
    showChartLoaders(['radarLoader', 'gaugeLoader', 'matrixLoader']);
    
    // Calculate growth data
    const growthData = calculateGrowthMetrics(results);
    
    // Create charts with delays to show loaders
    setTimeout(() => {
        createSkillsRadar(growthData.skillsData);
        hideChartLoader('radarLoader');
    }, 800);
    
    setTimeout(() => {
        createProgressGauge(growthData.currentScore, growthData.targetScore);
        hideChartLoader('gaugeLoader');
    }, 1200);
    
    setTimeout(() => {
        createPriorityMatrix(growthData.priorityData);
        hideChartLoader('matrixLoader');
    }, 1600);
}

function calculateGrowthMetrics(results) {
    // Skills radar data based on subject performance
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
            data: subjects.map(() => 85), // Target 85% for all subjects
            backgroundColor: 'rgba(247, 166, 33, 0.1)',
            borderColor: '#F7A621',
            borderWidth: 2,
            borderDash: [5, 5],
            pointBackgroundColor: '#F7A621'
        }]
    };

    // Priority matrix based on performance - Show full subject names
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
            subject: subject, // Keep full subject name
            score,
            priority,
            priorityTitle
        };
    });

    return {
        skillsData,
        currentScore: results.score,
        targetScore: 85,
        priorityData
    };
}

function createSkillsRadar(skillsData) {
    const ctx = document.getElementById('skillsRadarChart');
    if (!ctx) return;
    
    try {
        new Chart(ctx, {
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
        
        // Update legend
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

function createProgressGauge(currentScore, targetScore) {
    const ctx = document.getElementById('progressGauge');
    if (!ctx) return;
    
    try {
        const progress = (currentScore / targetScore) * 100;
        
        new Chart(ctx, {
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
        
        // Update gauge info
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

function createPriorityMatrix(priorityData) {
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

function showSubjectDetails(subject, subjectScore) {
    const results = JSON.parse(localStorage.getItem('examResults'));
    
    // Get detailed breakdown for this subject
    const subjectQuestions = examData.filter(q => q.classification.subject === subject);
    
    // Create hierarchical structure: subtopic -> sub-subtopic -> concept
    const hierarchicalData = {};
    
    subjectQuestions.forEach((question, idx) => {
        const globalIndex = examData.findIndex(q => q.question_id === question.question_id);
        const userAnswer = answers[globalIndex];
        const isCorrect = userAnswer === question.correct_answer;
        const isAttempted = userAnswer !== undefined;
        
        const subtopic = question.classification.subtopic || 'General';
        const subSubtopic = question.classification.sub_subtopic || 'General';
        const concept = question.classification.concept ? 
            (question.classification.concept.length > 50 ? 
                question.classification.concept.substring(0, 50) + '...' : 
                question.classification.concept) : 'General Concept';
        
        // Initialize hierarchical structure
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
        
        // Update stats at all levels
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
    
    // Create modal
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
                display: flex; justify-content: space-between; align-items: center;
                padding: 8px 12px; margin: 6px 0; background: #f8f9fa; 
                border-radius: 6px; border-left: 3px solid #dee2e6;
                font-size: 0.85em; line-height: 1.3;
            }
            .detail-item.good { border-left-color: #10B981; background: #f0fdf4; }
            .detail-item.average { border-left-color: #F7A621; background: #fffbeb; }
            .detail-item.poor { border-left-color: #EF4444; background: #fef2f2; }
            .detail-score { font-weight: bold; min-width: 45px; text-align: right; }
            .detail-score.good { color: #10B981; }
            .detail-score.average { color: #F7A621; }
            .detail-score.poor { color: #EF4444; }
            .section-header { 
                font-size: 0.95em; font-weight: 600; color: #101E3D; 
                margin-bottom: 10px; padding-bottom: 5px; 
                border-bottom: 2px solid #F7A621;
            }
        </style>
        
        <button onclick="this.closest('[style*=fixed]').remove()" 
                style="position: absolute; top: 15px; right: 15px; background: none; 
                border: none; font-size: 20px; cursor: pointer; color: #999; 
                width: 28px; height: 28px; border-radius: 50%; display: flex; 
                align-items: center; justify-content: center; 
                hover:background-color: #f5f5f5;">✕</button>
        
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
    
    // Close on backdrop click
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    // Close on escape key
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
                const displaySubtopic = subtopic.length > 35 ? subtopic.substring(0, 35) + '...' : subtopic;
                
                return `
                    <div style="margin-bottom: 20px; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden;">
                        <!-- Subtopic Header -->
                        <div class="detail-item ${subtopicClass}" style="margin: 0; border-radius: 0; border-left: none; border-left: 4px solid ${subtopicClass === 'good' ? '#10B981' : subtopicClass === 'average' ? '#F7A621' : '#EF4444'};">
                            <span style="font-weight: 600;">📚 ${displaySubtopic}</span>
                            <span class="detail-score ${subtopicClass}">
                                ${subtopicData.stats.correct}/${subtopicData.stats.attempted || subtopicData.stats.total}
                                ${subtopicData.stats.attempted > 0 ? ` (${subtopicPercentage}%)` : ''}
                            </span>
                        </div>
                        
                        <!-- Sub-Subtopics -->
                        <div style="padding: 0 0 0 15px;">
                            ${Object.entries(subtopicData.subSubtopics).map(([subSubtopic, subSubtopicData]) => {
                                const subSubtopicPercentage = subSubtopicData.stats.attempted > 0 ? 
                                    Math.round((subSubtopicData.stats.correct / subSubtopicData.stats.attempted) * 100) : 0;
                                const subSubtopicClass = subSubtopicPercentage >= 70 ? 'good' : subSubtopicPercentage >= 40 ? 'average' : 'poor';
                                const displaySubSubtopic = subSubtopic.length > 30 ? subSubtopic.substring(0, 30) + '...' : subSubtopic;
                                
                                return `
                                    <div style="border-top: 1px solid #f1f3f4;">
                                        <!-- Sub-Subtopic -->
                                        <div class="detail-item ${subSubtopicClass}" style="margin: 0; border-radius: 0; border-left: none; background: #f8f9fa; font-size: 0.8em;">
                                            <span style="font-weight: 500;">|-> 🔍 ${displaySubSubtopic}</span>
                                            <span class="detail-score ${subSubtopicClass}">
                                                ${subSubtopicData.stats.correct}/${subSubtopicData.stats.attempted || subSubtopicData.stats.total}
                                                ${subSubtopicData.stats.attempted > 0 ? ` (${subSubtopicPercentage}%)` : ''}
                                            </span>
                                        </div>
                                        
                                        <!-- Concepts -->
                                        <div style="padding-left: 15px; background: #fafbfc;">
                                            ${Object.entries(subSubtopicData.concepts).map(([concept, conceptData]) => {
                                                const conceptPercentage = conceptData.attempted > 0 ? 
                                                    Math.round((conceptData.correct / conceptData.attempted) * 100) : 0;
                                                const conceptClass = conceptPercentage >= 70 ? 'good' : conceptPercentage >= 40 ? 'average' : 'poor';
                                                const displayConcept = concept.length > 28 ? concept.substring(0, 28) + '...' : concept;
                                                
                                                return `
                                                    <div class="detail-item ${conceptClass}" style="margin: 0; border-radius: 0; border-left: none; background: transparent; font-size: 0.75em; padding: 6px 12px;">
                                                        <span style="color: #6c757d;">|--> 💡 ${displayConcept}</span>
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

function displayAPIError() {
    // Remove loading animations
    removeLoadingAnimations();
    
    // Hide chart loaders
    showChartLoaders([]);
    ['radarLoader', 'gaugeLoader', 'matrixLoader', 'dailyLoader', 'weeklyLoader', 'monthlyLoader'].forEach(hideChartLoader);
    
    // Show error state with fallback
    document.getElementById('aiPerformanceInsight').innerHTML = '<div style="color: #F7A621; font-style: italic; text-align: center; padding: 20px;">⚠️ AI insights require API configuration.<br><small>Showing sample analysis below.</small></div>';
    
    // Show fallback study plan and growth opportunities
    displayFallbackStudyPlan();
    
    const results = JSON.parse(localStorage.getItem('examResults'));
    displayGrowthOpportunities(results);
}

function displayStudyPlanCharts(studyPlan) {
    // Show loaders
    showChartLoaders(['dailyLoader', 'weeklyLoader', 'monthlyLoader']);
    
    // Display charts with delays
    setTimeout(() => {
        displayDailyTimeline(studyPlan.dailySchedule);
        hideChartLoader('dailyLoader');
    }, 600);
    
    setTimeout(() => {
        displayWeeklyFocus(studyPlan.weeklyFocus);
        hideChartLoader('weeklyLoader');
    }, 1000);
    
    setTimeout(() => {
        displayMonthlyGoals(studyPlan.monthlyTargets);
        hideChartLoader('monthlyLoader');
    }, 1400);
}

function displayDailyTimeline(dailySchedule) {
    const container = document.getElementById('dailyTimeline');
    if (!container) return;
    
    const today = new Date().getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today];
    
    // Show today's schedule prominently
    const todaySchedule = dailySchedule.find(day => day.day === todayName) || dailySchedule[0];
    
    container.innerHTML = `
        <div class="timeline-day" style="background: linear-gradient(135deg, rgba(247, 166, 33, 0.1), rgba(247, 166, 33, 0.05)); border-left: 3px solid #F7A621;">
            <h4>📍 Today's Focus - ${todaySchedule.day}</h4>
            ${generateTimeSlots(todaySchedule)}
        </div>
        
        <div style="max-height: 200px; overflow-y: auto; margin-top: 15px;">
            ${dailySchedule.filter(day => day.day !== todayName).map(day => `
                <div class="timeline-day">
                    <h4>${day.day}</h4>
                    ${generateTimeSlots(day)}
                </div>
            `).join('')}
        </div>
    `;
}

function generateTimeSlots(daySchedule) {
    const timeSlots = [
        { time: '9:00-10:00', subject: daySchedule.subjects[0]?.name || 'Study', type: 'study' },
        { time: '10:00-11:00', subject: daySchedule.subjects[1]?.name || 'Practice', type: 'practice' },
        { time: '11:00-11:15', subject: 'Break', type: 'rest' },
        { time: '11:15-12:15', subject: daySchedule.subjects[0]?.name || 'Study', type: 'study' },
        { time: '12:15-1:00', subject: 'Lunch Break', type: 'rest' },
        { time: '5:00-6:00', subject: 'Review & Practice', type: 'review' },
        { time: '6:00-7:00', subject: 'Evening Break', type: 'rest' }
    ];
    
    return timeSlots.map(slot => `
        <div class="time-slot">
            <span class="time-indicator">${slot.time}</span>
            <span class="subject-tag ${slot.type}">${slot.subject}</span>
        </div>
    `).join('');
}

function displayWeeklyFocus(weeklyFocus) {
    const container = document.getElementById('weeklyFocus');
    if (!container) return;
    
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

function displayMonthlyGoals(monthlyTargets) {
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

function createDailyChart(dailySchedule) {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dailySchedule.map(day => day.day.slice(0, 3)),
            datasets: [
                {
                    label: 'Study Hours',
                    data: dailySchedule.map(day => day.study),
                    backgroundColor: '#F7A621',
                    borderRadius: 4,
                    barThickness: 25
                },
                {
                    label: 'Rest Hours',
                    data: dailySchedule.map(day => day.rest),
                    backgroundColor: '#10B981',
                    borderRadius: 4,
                    barThickness: 25
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { boxWidth: 12, font: { size: 10 } }
                }
            },
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                },
                y: { 
                    beginAtZero: true,
                    max: 4,
                    grid: { color: '#f0f0f0' },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}

function createWeeklyChart(weeklyFocus) {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: weeklyFocus.map(item => item.subject),
            datasets: [{
                data: weeklyFocus.map(item => item.hours),
                backgroundColor: weeklyFocus.map(item => item.color),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 10 },
                        padding: 10,
                        usePointStyle: true
                    }
                }
            },
            cutout: '60%'
        }
    });
}

function removeLoadingAnimations() {
    // Safely remove loading animations
    const loaders = document.querySelectorAll('.insight-loader, .plan-loader');
    loaders.forEach(loader => {
        if (loader) {
            loader.style.display = 'none';
        }
    });
}

function showChartLoaders(loaderIds) {
    loaderIds.forEach(id => {
        const loader = document.getElementById(id);
        if (loader) {
            loader.classList.remove('hidden');
        }
    });
}

function hideChartLoader(loaderId) {
    const loader = document.getElementById(loaderId);
    if (loader) {
        loader.classList.add('hidden');
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
}

// New dashboard functions
function showDetailedReview() {
    showReview();
}

function generateStudyPlan() {
    alert('Opening personalized study planner... 📚\n\nUpgrade to Premium for:\n• AI-powered study schedules\n• Progress tracking\n• Adaptive learning paths');
}

function downloadDashboard() {
    const results = JSON.parse(localStorage.getItem('examResults'));
    const dashboardData = {
        ...results,
        generatedAt: new Date().toISOString(),
        dashboardType: 'AI-Powered Learning Dashboard'
    };
    
    const dataStr = JSON.stringify(dashboardData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `learning-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function showReview() {
    document.getElementById('resultsInterface').classList.add('hidden');
    document.getElementById('reviewInterface').classList.remove('hidden');
    generateReview();
}

function backToResults() {
    document.getElementById('reviewInterface').classList.add('hidden');
    document.getElementById('resultsInterface').classList.remove('hidden');
}

function showAllTopics() {
    const results = JSON.parse(localStorage.getItem('examResults'));
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
    
    // Sort topics by performance for better readability
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
        
        <style>
            @media (max-width: 768px) {
                .modal-content {
                    max-width: 95vw !important;
                    padding: 20px !important;
                    margin: 10px !important;
                }
            }
        </style>
    `;
    
    // Add mobile-friendly class
    content.className = 'modal-content';
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function generateReview() {
    const results = JSON.parse(localStorage.getItem('examResults'));
    const reviewContainer = document.getElementById('reviewContainer');
    reviewContainer.innerHTML = '';

    examData.forEach((question, index) => {
        const userAnswer = answers[index];
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
                <strong>Topic:</strong> ${buildTopicHierarchy(question.classification)}<br>
                <strong>Difficulty:</strong> ${question.difficulty_level}
            </div>
        `;

        reviewContainer.appendChild(reviewDiv);
    });
}

function displayKnowledgeCoverage(results) {
    const container = document.getElementById('knowledgeCoverage');
    const totalSubjects = Object.keys(results.subjectStats).length;
    const totalTopics = Object.keys(results.topicStats).length;
    const questionsAttempted = Object.keys(results.answers).length;
    
    const coveragePercentage = Math.round((questionsAttempted / examData.length) * 100);
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

function showReview() {
    switchInterface(SELECTORS.RESULTS_INTERFACE, SELECTORS.REVIEW_INTERFACE);
    generateReview();
}

function buildTopicHierarchy(classification) {
    const parts = [
        classification.subject,
        classification.topic,
        classification.subtopic,
        classification.sub_subtopic,
        classification.concept
    ].filter(part => part && part.trim() !== ''); // Remove null, undefined, and empty strings
    
    return parts.join(' → ');
}

function backToResults() {
    switchInterface(SELECTORS.REVIEW_INTERFACE, SELECTORS.RESULTS_INTERFACE);
}

function downloadResults() {
    const results = JSON.parse(localStorage.getItem('examResults'));
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `exam-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function restartExam() {
    resetExamState();
    resetUI();
    switchInterface(SELECTORS.RESULTS_INTERFACE, SELECTORS.LOADING);
    
    setTimeout(() => {
        initializeApp();
    }, 1000);
}

function resetExamState() {
    currentQuestion = 0;
    answers = {};
    startTime = null;
    examDuration = 0;
}

function resetUI() {
    // Reset subject breakdown visibility
    const subjectBreakdown = document.getElementById('subjectBreakdown');
    if (subjectBreakdown && subjectBreakdown.parentElement) {
        subjectBreakdown.parentElement.style.display = 'block';
    }
}

// Scroll to top functionality
const scrollToTopButton = document.getElementById('scrollToTop');

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

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', initializeApp);