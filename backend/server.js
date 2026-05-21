import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Razorpay from 'razorpay';
import crypto from 'crypto';

dotenv.config();

// Initialize Razorpay Client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS and Middleware
app.use(cors({
  origin: '*', // Allow all origins for easy front-end hosting integration
}));
app.use(express.json());

// Configure Multer for In-Memory file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit PDF file size to 10MB
  }
});

// Setup Gemini AI (resilient caller with automatic fallback)
async function callGemini(prompt, generationConfig = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not defined.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig
    });
    return result;
  } catch (error) {
    console.error(`🔴 Gemini API error with model '${modelName}':`, error.message);
    
    // Retrying with gemini-1.5-flash as robust fallback
    const fallbackModel = "gemini-1.5-flash";
    if (modelName !== fallbackModel) {
      console.warn(`⚠️ Retrying generation using stable fallback model '${fallbackModel}'...`);
      try {
        const model = genAI.getGenerativeModel({ model: fallbackModel });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig
        });
        return result;
      } catch (fallbackError) {
        console.error("🔴 Fallback model also failed:", fallbackError.message);
        throw fallbackError;
      }
    }
    throw error;
  }
}

// Route: Health Check
app.get('/api/health', (req, res) => {
  const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const displayModel = modelName.split('-').map(word => {
    if (word.includes('.')) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');

  res.json({
    status: 'healthy',
    apiMode: process.env.GEMINI_API_KEY ? `Live (${displayModel})` : 'Mock/Demo Mode',
    timestamp: new Date().toISOString()
  });
});

// API: Create Razorpay Order
app.post('/api/create-order', async (req, res) => {
  try {
    const { tier } = req.body;
    let amount = 9900; // Default monthly plan is ₹99 (in paise)

    if (tier === 'yearly') {
      amount = 79900; // Yearly plan is ₹799 (in paise)
    }

    const options = {
      amount: amount,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    console.log(`💳 Creating Razorpay Order for tier '${tier}' (amount: ${amount} paise)...`);
    const order = await razorpay.orders.create(options);
    console.log(`✅ Razorpay Order Created successfully: ${order.id}`);
    res.json(order);
  } catch (error) {
    console.error("🔴 Failed to create Razorpay Order:", error);
    res.status(500).json({ error: "Failed to create payment order. Please try again.", details: error.message });
  }
});

// API: Verify Razorpay Payment Signature
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing required signature verification fields." });
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      console.log(`🎉 Payment Signature VERIFIED successfully for Order: ${razorpay_order_id}`);
      res.json({ status: 'success', message: 'Payment verified successfully.' });
    } else {
      console.error(`⚠️ Invalid Payment Signature for Order: ${razorpay_order_id}`);
      res.status(400).json({ status: 'failure', error: 'Payment verification failed. Invalid signature.' });
    }
  } catch (error) {
    console.error("🔴 Signature Verification Failed with error:", error);
    res.status(500).json({ error: "Signature verification system error.", details: error.message });
  }
});

// Helper: Extract text from PDF buffer
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Failed to extract text from the PDF file.");
  }
}

// API: Generate Interactive MCQ Quiz
app.post('/api/generate-quiz', upload.single('file'), async (req, res) => {
  try {
    let studyContent = "";

    // 1. Get content from PDF upload or raw text
    if (req.file) {
      studyContent = await extractTextFromPDF(req.file.buffer);
    } else if (req.body.text) {
      studyContent = req.body.text;
    } else {
      return res.status(400).json({ error: "Missing study material. Please upload a PDF file or enter raw text." });
    }

    // Sanitize and limit input length (max ~100k characters for safety/limits)
    studyContent = studyContent.substring(0, 100000).trim();

    if (!studyContent) {
      return res.status(400).json({ error: "Extracted study material is empty. Please provide readable text." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 2. Demo Mode Fallback
    if (!apiKey) {
      return res.json(getMockQuiz(studyContent.substring(0, 300)));
    }

    // 3. Construct the prompt for high-stakes exam quizzes (NEET, JEE, UPSC, AP style)
    const prompt = `
      You are an expert academic examiner and tutor.
      Based on the following study material, generate an interactive quiz consisting of exactly 10 high-quality, concept-testing Multiple Choice Questions (MCQs) aligned with competitive academic standards.
      
      Study Material:
      """
      ${studyContent}
      """
      
      Requirements for each MCQ:
      1. Challenge the student's conceptual understanding (avoid extremely trivial recall questions).
      2. Provide exactly 4 options (Option A, B, C, D).
      3. Specify the correct option clearly.
      4. Provide a detailed, step-by-step "explanation" explaining WHY that option is correct and why other options are incorrect. Refer directly to concepts mentioned in the text.
      
      Return the response as a JSON array matching this exact TypeScript structure:
      interface QuizQuestion {
        question: string;
        options: [string, string, string, string]; // Exactly 4 options
        answer: string; // The exact text of the correct option (must match one of the options exactly)
        explanation: string;
      }
    `;

    // 4. Request from Gemini with JSON output guarantee
    const result = await callGemini(prompt, {
      responseMimeType: "application/json",
    });

    const quizJSON = JSON.parse(result.response.text());
    res.json(quizJSON);

  } catch (error) {
    console.error("Quiz Generation Failed:", error);
    res.status(500).json({ error: "Failed to generate quiz. Please try again.", details: error.message });
  }
});

// API: Generate Spaced Repetition Flashcards
app.post('/api/generate-flashcards', upload.single('file'), async (req, res) => {
  try {
    let studyContent = "";

    // 1. Get content from PDF upload or raw text
    if (req.file) {
      studyContent = await extractTextFromPDF(req.file.buffer);
    } else if (req.body.text) {
      studyContent = req.body.text;
    } else {
      return res.status(400).json({ error: "Missing study material. Please upload a PDF file or enter raw text." });
    }

    studyContent = studyContent.substring(0, 100000).trim();

    if (!studyContent) {
      return res.status(400).json({ error: "Extracted study material is empty. Please provide readable text." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 2. Demo Mode Fallback
    if (!apiKey) {
      return res.json(getMockFlashcards(studyContent.substring(0, 300)));
    }

    // 3. Construct the prompt for Active Recall flashcards
    const prompt = `
      You are an expert learning specialist. Your task is to extract core definitions, formulas, dates, and essential concepts from the provided study material and turn them into highly effective active-recall flashcards.
      
      Study Material:
      """
      ${studyContent}
      """
      
      Requirements for Flashcards:
      1. Create exactly 12 flashcards.
      2. The "front" of the card should present a clear, focused question, formula challenge, or concept definition query.
      3. The "back" of the card should contain a concise, precise, and memory-friendly answer. Avoid huge paragraphs; use bullet points if explaining a multi-step concept.
      
      Return the response as a JSON array matching this exact TypeScript structure:
      interface Flashcard {
        front: string; // The question / prompt / formula query
        back: string;  // The short, punchy, accurate answer / solution
      }
    `;

    // 4. Request from Gemini
    const result = await callGemini(prompt, {
      responseMimeType: "application/json",
    });

    const flashcardsJSON = JSON.parse(result.response.text());
    res.json(flashcardsJSON);

  } catch (error) {
    console.error("Flashcards Generation Failed:", error);
    res.status(500).json({ error: "Failed to generate flashcards. Please try again.", details: error.message });
  }
});

// Helper: Standard mock quiz generator for Demo Mode
function getMockQuiz(previewText) {
  const text = (previewText || "").toLowerCase();

  // 1. NEET Photosynthesis Specialized Quiz
  if (text.includes("photosynthesis") || text.includes("calvin") || text.includes("light reaction")) {
    return [
      {
        question: "In non-cyclic photophosphorylation (Z-scheme), which molecule serves as the ultimate primary electron donor for Photosystem II (PS II)?",
        options: [
          "NADPH",
          "Carbon Dioxide (CO2)",
          "Water (H2O)",
          "Plastocyanin"
        ],
        answer: "Water (H2O)",
        explanation: "During the light reaction, photolysis of water occurs at the oxygen-evolving complex associated with PS II on the inner side of the thylakoid membrane. Water splitting (2H2O -> 4H+ + O2 + 4e-) provides replacement electrons to the oxidized reaction center P680 of PS II."
      },
      {
        question: "What is the net chemical cost in terms of ATP and NADPH to synthesize exactly one molecule of glucose through the C3 Calvin Cycle?",
        options: [
          "18 ATP and 12 NADPH",
          "12 ATP and 18 NADPH",
          "30 ATP and 12 NADPH",
          "6 ATP and 6 NADPH"
        ],
        answer: "18 ATP and 12 NADPH",
        explanation: "For every single CO2 molecule fixed in the Calvin cycle, 3 ATP and 2 NADPH are consumed (2 ATP & 2 NADPH during reduction, and 1 ATP during regeneration). Since 6 turns of the cycle are required to produce one 6-carbon glucose molecule (6 CO2 fixed), the net cost is 6 * 3 = 18 ATP and 6 * 2 = 12 NADPH."
      },
      {
        question: "RuBisCO has active sites that bind both CO2 and O2. What is the wasteful process triggered when RuBisCO binds oxygen in C3 plants?",
        options: [
          "Anaerobic Respiration",
          "Photorespiration (C2 Cycle)",
          "Crassulacean Acid Metabolism",
          "Cyclic Photophosphorylation"
        ],
        answer: "Photorespiration (C2 Cycle)",
        explanation: "RuBisCO stands for RuBP carboxylase-oxygenase. When O2 concentration is high relative to CO2, RuBisCO binds oxygen instead of CO2, converting RuBP to 3-PGA and phosphoglycolate. This is a wasteful pathway called photorespiration which consumes ATP and releases CO2 without producing sugar or NADPH."
      },
      {
        question: "Where in the chloroplast does cyclic photophosphorylation occur, and what is its product?",
        options: [
          "Thylakoid lumen; produces both ATP and NADPH",
          "Stroma lamellae; produces only ATP",
          "Stroma matrix; produces glucose",
          "Outer membrane; produces oxygen"
        ],
        answer: "Stroma lamellae; produces only ATP",
        explanation: "The stroma lamellae membrane lacks PS II and the NADP reductase enzyme. Therefore, electrons excited from PS I cycle back through the cytochrome complex, creating a proton gradient that drives ATP synthesis, but no NADPH is synthesized and no water is split (no oxygen released)."
      },
      {
        question: "During the carboxylation stage of the Calvin Cycle, what is the initial CO2 acceptor molecule and what enzyme catalyzes the reaction?",
        options: [
          "Phosphoenolpyruvate (PEP); PEP carboxylase",
          "3-Phosphoglyceric acid (3-PGA); RuBisCO",
          "Ribulose-1,5-bisphosphate (RuBP); RuBisCO",
          "Oxaloacetic acid (OAA); Malate Dehydrogenase"
        ],
        answer: "Ribulose-1,5-bisphosphate (RuBP); RuBisCO",
        explanation: "Carboxylation is the fixation of CO2 into a stable organic intermediate. In C3 plants, CO2 is accepted by Ribulose-1,5-bisphosphate (RuBP, a 5-carbon sugar) to form two molecules of 3-PGA. This reaction is catalyzed by the enzyme RuBisCO."
      }
    ];
  }

  // 2. UPSC Fundamental Rights Specialized Quiz
  if (text.includes("fundamental rights") || text.includes("preamble") || text.includes("constitution") || text.includes("article")) {
    return [
      {
        question: "In the landmark Kesavananda Bharati case (1973), what did the Supreme Court of India rule regarding the amendment of the Preamble?",
        options: [
          "The Preamble is not a part of the Constitution and cannot be amended under any article.",
          "The Preamble is an integral part of the Constitution and can be amended under Article 368, provided the Basic Structure is not destroyed.",
          "The Preamble can only be amended by a direct national referendum.",
          "Only the fundamental rights can be amended, while the Preamble remains completely immutable."
        ],
        answer: "The Preamble is an integral part of the Constitution and can be amended under Article 368, provided the Basic Structure is not destroyed.",
        explanation: "The Supreme Court overturned its previous Berubari Union ruling and held that the Preamble is indeed a part of the Constitution. It is amendable under Article 368, subject to the 'Basic Structure Doctrine'—meaning the basic features like democracy, secularism, and rule of law cannot be altered."
      },
      {
        question: "Which article of the Indian Constitution was referred to as the 'Heart and Soul' of the Constitution by Dr. B.R. Ambedkar?",
        options: [
          "Article 14 (Equality Before Law)",
          "Article 19 (Right to Freedom)",
          "Article 21 (Protection of Life and Personal Liberty)",
          "Article 32 (Right to Constitutional Remedies)"
        ],
        answer: "Article 32 (Right to Constitutional Remedies)",
        explanation: "Dr. B.R. Ambedkar called Article 32 the 'Heart and Soul' of the Constitution because it guarantees the Right to Constitutional Remedies. It empowers citizens to move the Supreme Court directly to enforce Fundamental Rights via writs (Habeas Corpus, Mandamus, etc.), making the rights practical and enforceable."
      },
      {
        question: "Article 13 of the Indian Constitution is highly significant because it serves as the constitutional anchor for which judicial power?",
        options: [
          "The appointment of judges via the Collegium system",
          "Judicial Review of legislative acts violating Fundamental Rights",
          "The creation of fast-track special tribunals",
          "The power of the Supreme Court to advise the President"
        ],
        answer: "Judicial Review of legislative acts violating Fundamental Rights",
        explanation: "Article 13 explicitly states that any law (statutory, custom, or ordinance) that is inconsistent with or in derogation of Fundamental Rights shall be void to the extent of the inconsistency. This provides the direct basis for the courts to exercise judicial review over legislative actions."
      },
      {
        question: "Which of the following pairs of Fundamental Rights cannot be suspended even during a National Emergency declared under Article 352?",
        options: [
          "Articles 14 and 19",
          "Articles 20 and 21",
          "Articles 21 and 22",
          "Articles 19 and 20"
        ],
        answer: "Articles 20 and 21",
        explanation: "By virtue of the 44th Constitutional Amendment Act of 1978, the right to protection in respect of conviction for offenses (Article 20) and the right to life and personal liberty (Article 21) cannot be suspended even during a national emergency."
      },
      {
        question: "The writ of 'Habeas Corpus' can be issued by the higher judiciary against which of the following authorities?",
        options: [
          "Only public/state authorities",
          "Only private individuals",
          "Both public authorities and private individuals",
          "Only administrative tribunals"
        ],
        answer: "Both public authorities and private individuals",
        explanation: "Habeas Corpus literally means 'To have the body of'. Uniquely among writs, it can be issued against both public officials and private entities/individuals who have illegally or arbitrarily detained a citizen, ensuring immediate personal liberty protection."
      }
    ];
  }

  // 3. Default General Mock Quiz
  return [
    {
      question: "What is the primary benefit of active recall and spaced repetition in studying?",
      options: [
        "It increases the speed of reading textbooks.",
        "It strengthens neural pathways and prevents the natural decay of memory over time.",
        "It eliminates the need to attend live classes.",
        "It is only useful for mathematics and formula calculations."
      ],
      answer: "It strengthens neural pathways and prevents the natural decay of memory over time.",
      explanation: "Active recall forces the brain to retrieve information, which strengthens synaptic connections. Spaced repetition schedules reviews at optimal intervals, interrupting the 'Forgetting Curve' and shifting short-term knowledge into long-term memory."
    },
    {
      question: "Based on the text preview: '" + (previewText.substring(0, 50) || "Study guide") + "...', what is the best starting point for exam preparation?",
      options: [
        "Memorizing exam answer keys without reading notes.",
        "Uploading custom syllabus outlines into a grounded AI system for structured practice.",
        "Passive rereading of study materials multiple times.",
        "Relying entirely on late-night cramming sessions before tests."
      ],
      answer: "Uploading custom syllabus outlines into a grounded AI system for structured practice.",
      explanation: "Passive reading has been scientifically proven to create an 'illusion of competence' where a student feels they know the topic but fails to retrieve it under exam pressure. Grounded study systems create structured active-recall assessments."
    },
    {
      question: "How does the 'Forgetting Curve' affect a student's retention of new concepts?",
      options: [
        "Memory retention remains 100% stable for up to 30 days without review.",
        "Memory decays exponentially, with the steepest decline occurring within the first 24 to 48 hours.",
        "Forgetting only occurs if the student is not paying attention during lectures.",
        "The human brain naturally remembers everything it reads after age 18."
      ],
      answer: "Memory decays exponentially, with the steepest decline occurring within the first 24 to 48 hours.",
      explanation: "Hermann Ebbinghaus discovered that without immediate review, retention drops to nearly 50% in the first 24 hours. Regular, scheduled reviews dramatically flatten the forgetting curve."
    }
  ];
}

// Helper: Standard mock flashcards generator for Demo Mode
function getMockFlashcards(previewText) {
  const text = (previewText || "").toLowerCase();

  // 1. NEET Photosynthesis Flashcards
  if (text.includes("photosynthesis") || text.includes("calvin") || text.includes("light reaction")) {
    return [
      {
        front: "What pigment acts as the primary reaction center in Photosystem II (PS II)?",
        back: "Chlorophyll a P680. It absorbs solar light at a wavelength of 680 nm to trigger the non-cyclic photophosphorylation pathway."
      },
      {
        front: "State the chemical reaction of the photolysis of water at PS II.",
        back: "2H2O -> 4H+ + O2 + 4e-. This splitting occurs on the inner side of the thylakoid membrane, releasing oxygen as a byproduct."
      },
      {
        front: "What makes cyclic photophosphorylation different from non-cyclic photophosphorylation?",
        back: "Cyclic occurs only in stroma lamellae, involves PS I only, generates ONLY ATP, and does NOT produce NADPH or split water."
      },
      {
        front: "What enzyme catalyzes the primary carbon fixation reaction in C3 plants?",
        back: "RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase). It is the most abundant enzyme on Earth."
      },
      {
        front: "What is the first stable product of CO2 fixation in C3 plants?",
        back: "3-Phosphoglyceric acid (3-PGA), a stable 3-carbon organic acid."
      },
      {
        front: "How many ATP and NADPH are required to synthesize exactly one molecule of Glucose in the Calvin Cycle?",
        back: "18 ATP and 12 NADPH. Fixing 1 CO2 requires 3 ATP and 2 NADPH, and it takes 6 turns (6 CO2) to make 1 glucose."
      },
      {
        front: "What is photorespiration (C2 Cycle) in plants?",
        back: "A wasteful process where RuBisCO acts as an oxygenase (binding O2 instead of CO2), consuming ATP and releasing CO2 without generating sugars."
      },
      {
        front: "What is the primary anatomical adaptation of C4 plants to prevent photorespiration?",
        back: "Kranz Anatomy. Wreath-like arrangement of bundle-sheath cells around vascular bundles, separating initial fixation from RuBisCO."
      },
      {
        front: "What is the primary CO2 acceptor and enzyme in C4 plants?",
        back: "Phosphoenolpyruvate (PEP) is the acceptor, and PEP carboxylase (PEPcase) is the enzyme, located in mesophyll cells."
      },
      {
        front: "Why do stroma lamellae membranes lack non-cyclic photophosphorylation?",
        back: "Because they completely lack Photosystem II (PS II) and the NADP reductase enzyme."
      },
      {
        front: "What are the three main phases of the Calvin Cycle?",
        back: "1. Carboxylation (CO2 fixation to RuBP), 2. Reduction (ATP/NADPH used to form G3P), 3. Regeneration (ATP used to recreate RuBP)."
      },
      {
        front: "Where do the Light Reactions and Dark Reactions take place in chloroplasts?",
        back: "Light Reactions take place in the membranous Grana/Thylakoids. Dark Reactions (Calvin Cycle) occur in the fluid Stroma."
      }
    ];
  }

  // 2. UPSC Fundamental Rights Flashcards
  if (text.includes("fundamental rights") || text.includes("preamble") || text.includes("constitution") || text.includes("article")) {
    return [
      {
        front: "Where are Fundamental Rights located in the Constitution of India?",
        back: "Part III, spanning Articles 12 to 35. It is referred to as the 'Magna Carta' of India."
      },
      {
        front: "What is established under Article 13 of the Indian Constitution?",
        back: "It declares that any law that violates or is inconsistent with Fundamental Rights is null and void, serving as the basis for Judicial Review."
      },
      {
        front: "Name the six categories of Fundamental Rights currently guaranteed in India.",
        back: "1. Equality (14-18)\n2. Freedom (19-22)\n3. Against Exploitation (23-24)\n4. Religious Freedom (25-28)\n5. Cultural & Minority Rights (29-30)\n6. Constitutional Remedies (32)."
      },
      {
        front: "Which Article guarantees 'Equality Before Law' and 'Equal Protection of Laws'?",
        back: "Article 14, which applies to both citizens and foreigners."
      },
      {
        front: "Which Article guarantees the Right to Education (RTE), and how was it added?",
        back: "Article 21A, which mandates free/compulsory education for children aged 6-14. It was added by the 86th Constitutional Amendment Act of 2002."
      },
      {
        front: "Which Fundamental Rights cannot be suspended during a National Emergency under Article 352?",
        back: "Articles 20 (protection against conviction) and 21 (protection of life and personal liberty), as protected by the 44th Amendment Act."
      },
      {
        front: "Why did Dr. B.R. Ambedkar call Article 32 the 'Heart and Soul' of the Constitution?",
        back: "Because it guarantees the Right to Constitutional Remedies, allowing citizens to approach the Supreme Court directly to enforce their rights via writs."
      },
      {
        front: "What are the 5 types of writs that can be issued under Article 32?",
        back: "1. Habeas Corpus (to free a detainee)\n2. Mandamus (to command a duty)\n3. Prohibition (to stop lower court)\n4. Certiorari (to quash order)\n5. Quo-Warranto (to challenge office claim)."
      },
      {
        front: "What is the 'Basic Structure Doctrine' and its origin?",
        back: "Established in the Kesavananda Bharati case (1973), it rules that Parliament can amend any part of the Constitution under Art 368, but cannot alter its fundamental features."
      },
      {
        front: "What does Article 17 of the Indian Constitution accomplish?",
        back: "It completely abolishes the practice of 'Untouchability' in any form, making its practice a punishable legal offense."
      },
      {
        front: "Are Fundamental Rights absolute or qualified in India?",
        back: "They are qualified. The state can impose 'reasonable restrictions' on them for national security, public order, morality, or decency."
      },
      {
        front: "What does the writ of Mandamus literally translate to, and what does it do?",
        back: "Translates to 'We Command'. It is a command issued by a court to a public authority to perform an official duty they have failed or refused to do."
      }
    ];
  }

  // 3. Default General Mock Flashcards
  return [
    {
      front: "What is Active Recall?",
      back: "A learning principle where you actively retrieve information from memory (e.g., through testing/flashcards) rather than passively re-reading or highlighted text."
    },
    {
      front: "What is the Spaced Repetition System (SRS)?",
      back: "A system where flashcards are reviewed at increasing intervals (1 day, 3 days, 7 days, etc.) based on how well you remember them, maximizing memory retention."
    },
    {
      front: "Who discovered the Forgetting Curve?",
      back: "Hermann Ebbinghaus, who demonstrated that memory retention decays exponentially over time unless reinforced through active recall."
    },
    {
      front: "How do you avoid the 'Illusion of Competence'?",
      back: "By testing yourself constantly using custom quizzes, rather than passively highlighting or re-reading slides that make you feel like you understand the content."
    }
  ];
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 PrepCraft AI Backend is running on http://localhost:${PORT}`);
});
