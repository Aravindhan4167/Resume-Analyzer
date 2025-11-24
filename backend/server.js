require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const pdf = require('pdf-parse');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3001;

// --- Supabase Client Initialization (for Auth) 
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Supabase URL and Key are required.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Mongoose Schemas and Models ---
const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    keywords: { type: [String], required: true }
});
const Role = mongoose.model('Role', roleSchema);

const resumeSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    file_name: { type: String },
    role: { type: String, required: true },
    analysis: { type: Object },
    created_at: { type: Date, default: Date.now }
});
const Resume = mongoose.model('Resume', resumeSchema);

// --- Database Seeding for Roles ---
const seedRoles = async () => {
    try {
        const count = await Role.countDocuments();
        if (count > 0) {
            console.log('Roles already exist in DB. Skipping seed.');
            return;
        }
        
        console.log('No roles found. Seeding database...');
        const defaultRoles = [
            { name: 'Software Engineer', keywords: ['javascript', 'react', 'node', 'python', 'algorithm', 'data structure'] },
            { name: 'Web Developer', keywords: ['html', 'css', 'javascript', 'react', 'angular', 'vue'] },
            { name: 'Product Manager', keywords: ['roadmap', 'agile', 'scrum', 'user story', 'market research'] },
            { name: 'Data Scientist', keywords: ['python', 'r', 'sql', 'machine learning', 'tensorflow', 'statistics'] },
            { name: 'UX Designer', keywords: ['figma', 'sketch', 'wireframe', 'prototype', 'user research'] },
            { name: 'Project Manager', keywords: ['gantt chart', 'agile', 'scrum', 'budget', 'pmp'] },
            { name: 'Other', keywords: [] }
        ];
        await Role.insertMany(defaultRoles);
        console.log('Default roles have been added to the database.');

    } catch (error) {
        console.error('Error seeding roles:', error);
    }
};

// --- MongoDB Connection and App Start ---
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("Error: MONGODB_URI is required.");
  process.exit(1);
}
mongoose.connect(mongoUri)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    seedRoles(); // Seed roles after successful connection
    app.listen(port, () => {
      console.log(`Backend server listening at http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// --- Middleware ---
app.use(cors());
app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Auth Middleware ---
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header is missing.' });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token.' });
    
    req.user = user;
    next();
};

// --- API Routes ---
app.get('/api/roles', authenticate, async (req, res) => {
    try {
        const roles = await Role.find().sort({ name: 1 });
        res.status(200).json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch roles.' });
    }
});

app.get('/api/resumes', authenticate, async (req, res) => {
    try {
        const { role } = req.query;
        const filter = { user_id: req.user.id };
        if (role) filter.role = role;
        
        const resumes = await Resume.find(filter).sort({ created_at: -1 });
        res.status(200).json(resumes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resumes.' });
    }
});

app.post('/api/upload', authenticate, upload.single('resume'), async (req, res) => {
  const { role: roleName } = req.body;

  if (!req.file) return res.status(400).json({ error: 'No resume file uploaded.' });
  if (!roleName) return res.status(400).json({ error: 'No role selected.' });

  try {
    // 1. Fetch the role from DB to get keywords
    const roleData = await Role.findOne({ name: roleName });
    if (!roleData) return res.status(404).json({ error: `Role '${roleName}' not found.` });

    // 2. Parse PDF
    const data = await pdf(req.file.buffer);
    const text = data.text;

    // 3. Perform Analysis with role-specific keywords
    const wordCount = text.trim().split(/\s+/).length;
    const foundKeywords = roleData.keywords.filter(kw => new RegExp(`\\b${kw}\\b`, 'gi').test(text));

    // 4. Make decision
    let finalResult = 'Rejected';
    // Accept if word count is reasonable and at least 30% of the expected keywords are found (or 1 if keywords < 3)
    const requiredKeywordCount = roleData.keywords.length < 3 ? 1 : Math.ceil(roleData.keywords.length * 0.3);
    if (wordCount > 200 && wordCount < 1200 && (foundKeywords.length >= requiredKeywordCount || roleData.keywords.length === 0)) {
        finalResult = 'Accepted';
    }

    const analysisResult = {
      wordCount,
      foundKeywords,
      expectedKeywords: roleData.keywords,
      fullText: text.substring(0, 500) + '...',
      finalResult: finalResult
    };

    // 5. Save to DB
    const newResume = await Resume.create({
        user_id: req.user.id,
        file_name: req.file.originalname,
        role: roleName,
        analysis: analysisResult,
    });

    res.status(200).json({ message: 'Resume uploaded and analyzed successfully.', data: newResume });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Failed to process the resume file.' });
  }
});
