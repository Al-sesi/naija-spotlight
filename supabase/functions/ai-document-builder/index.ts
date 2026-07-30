import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-70b-versatile";

type DocumentType = "cv" | "cover_letter" | "both";

interface BuilderRequest {
  documentType: DocumentType;
  targetRole: string;
  companyName?: string;
  jobTitle?: string;
  opportunityId?: string;
  jobDescription?: string;
  yearsExperience?: string;
  achievements?: string;
  workHistory?: string;
  certifications?: string;
  strengths?: string;
  additionalInstructions?: string;
  cvData?: {
    personalInfo?: {
      fullName?: string;
      email?: string;
      phone?: string;
      location?: string;
      linkedin?: string;
      website?: string;
      title?: string;
    };
    professionalSummary?: string;
    workExperience?: Array<{
      id: string;
      company: string;
      role: string;
      startDate: string;
      endDate: string;
      current: boolean;
      description: string;
    }>;
    education?: Array<{
      id: string;
      institution: string;
      degree: string;
      field: string;
      startDate: string;
      endDate: string;
      description: string;
    }>;
    skills?: string[];
    certificationsList?: Array<{
      id: string;
      name: string;
      issuer: string;
      date: string;
    }>;
    projects?: Array<{
      id: string;
      name: string;
      description: string;
      link: string;
      technologies: string;
    }>;
    languages?: Array<{
      id: string;
      language: string;
      proficiency: string;
    }>;
    references?: Array<{
      id: string;
      name: string;
      position: string;
      company: string;
      contact: string;
    }>;
  };
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  state: string | null;
  country: string | null;
  highest_qualification: string | null;
  field_of_study: string | null;
  institution: string | null;
  graduation_year: number | null;
  career_statuses: string[] | null;
  skills: string[] | null;
  interests: string[] | null;
  preferred_industries: string[] | null;
}

interface OpportunityRow {
  id: string;
  title: string;
  provider: string;
  description: string | null;
  category: string;
  level: string | null;
  state: string;
  is_remote: boolean | null;
}

interface BuilderResponse {
  cv: string;
  coverLetter: string;
  provider: "groq";
  aiModel: string;
  tokensUsed: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment variables are not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const payload = (await req.json()) as BuilderRequest;
    validatePayload(payload);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone_number, state, country, highest_qualification, field_of_study, institution, graduation_year, career_statuses, skills, interests, preferred_industries")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return jsonResponse({ error: "Please complete your profile before using the AI builder" }, 400);
    }

    let opportunity: OpportunityRow | null = null;
    if (payload.opportunityId) {
      const { data: opportunityData, error: opportunityError } = await supabase
        .from("opportunities")
        .select("id, title, provider, description, category, level, state, is_remote")
        .eq("id", payload.opportunityId)
        .maybeSingle();

      if (opportunityError) {
        throw opportunityError;
      }

      opportunity = opportunityData;
    }

    const generated = await buildDocumentsWithGroq(profile, payload, opportunity);

    const { error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        user_id: user.id,
        document_type: payload.documentType,
        target_role: payload.targetRole,
        company_name: payload.companyName || null,
        job_title: payload.jobTitle || null,
        opportunity_id: payload.opportunityId || null,
        cv_content: generated.cv,
        cover_letter_content: generated.coverLetter,
        request_snapshot: payload as unknown as Record<string, unknown>,
        ai_provider: "groq",
        ai_model: generated.aiModel,
        tokens_used: generated.tokensUsed,
      });

    if (insertError) {
      console.error("Failed to save generated document history:", insertError);
    }

    return jsonResponse<BuilderResponse>(generated);
  } catch (error) {
    console.error("ai-document-builder error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
};

function validatePayload(payload: BuilderRequest) {
  if (!payload.documentType || !["cv", "cover_letter", "both"].includes(payload.documentType)) {
    throw new Error("A valid document type is required");
  }

  if (!payload.targetRole?.trim() && !payload.cvData?.personalInfo?.fullName) {
    throw new Error("Target role is required");
  }
}

async function buildDocumentsWithGroq(
  profile: ProfileRow,
  payload: BuilderRequest,
  opportunity: OpportunityRow | null,
): Promise<BuilderResponse> {
  if (!GROQ_API_KEY) {
    return {
      ...buildFallbackDocuments(profile, payload, opportunity),
      provider: "groq",
      aiModel: "fallback-template",
      tokensUsed: 0,
    };
  }

  const cvData = payload.cvData;
  const profileFullName = cvData?.personalInfo?.fullName || profile.full_name || "Your Name";
  const profileEmail = cvData?.personalInfo?.email || profile.email || "";
  const profilePhone = cvData?.personalInfo?.phone || profile.phone_number || "";
  const profileLocation = cvData?.personalInfo?.location ||
    [profile.state, profile.country].filter(Boolean).join(", ") || "Nigeria";

  const mergedSkills = Array.from(new Set([
    ...(cvData?.skills || []),
    ...(profile.skills || []),
  ]));

  const buildCVPrompt = () => `You are an expert CV writer for the Nigerian job market. Write a professional, ATS-optimized CV for the following candidate. Format it using plain text with clear section headers in ALL CAPS. Make it compelling, achievement-oriented, and tailored to the role of "${payload.targetRole}". Use STAR method for experience bullets.

CANDIDATE INFORMATION:
Name: ${profileFullName}
Title: ${cvData?.personalInfo?.title || payload.targetRole}
Email: ${profileEmail}
Phone: ${profilePhone}
Location: ${profileLocation}
LinkedIn: ${cvData?.personalInfo?.linkedin || ""}
Website: ${cvData?.personalInfo?.website || ""}

PROFESSIONAL SUMMARY RAW NOTES: ${cvData?.professionalSummary || `Motivated ${profile.highest_qualification || "professional"} with ${payload.yearsExperience || "relevant"} experience targeting ${payload.targetRole}. Background in ${profile.field_of_study || "growth"}.`}

WORK EXPERIENCE:
${(cvData?.workExperience || []).map(exp => `
Company: ${exp.company}
Role: ${exp.role}
Dates: ${exp.startDate} - ${exp.current ? "Present" : exp.endDate}
Details: ${exp.description}
`).join("\n---\n") || `Raw notes: ${payload.workHistory || profile.career_statuses?.join(", ") || "Entry-level candidate"}`}

EDUCATION:
${(cvData?.education || []).map(edu => `
Institution: ${edu.institution}
Degree: ${edu.degree}
Field: ${edu.field}
Dates: ${edu.startDate} - ${edu.endDate}
${edu.description}
`).join("\n---\n") || `Institution: ${profile.institution || ""}
Qualification: ${profile.highest_qualification || ""}
Field: ${profile.field_of_study || ""}
Graduation: ${profile.graduation_year || ""}`}

SKILLS: ${mergedSkills.length > 0 ? mergedSkills.join(", ") : payload.strengths || ""}

CERTIFICATIONS:
${(cvData?.certificationsList || []).map(c => `- ${c.name} - ${c.issuer} (${c.date})`).join("\n") || payload.certifications || "None provided"}

PROJECTS:
${(cvData?.projects || []).map(p => `
Project: ${p.name}
Description: ${p.description}
Tech: ${p.technologies}
Link: ${p.link}
`).join("\n---\n") || payload.achievements || ""}

LANGUAGES:
${(cvData?.languages || []).map(l => `- ${l.language} (${l.proficiency})`).join("\n") || "English (Fluent)"}

REFERENCES:
${(cvData?.references || []).map(r => `${r.name}, ${r.position} at ${r.company} - ${r.contact}`).join("\n") || "Available on request"}

ADDITIONAL INSTRUCTIONS: ${payload.additionalInstructions || ""}

JOB CONTEXT:
Company: ${payload.companyName || opportunity?.provider || ""}
Job Title: ${payload.jobTitle || opportunity?.title || payload.targetRole}
Job Description: ${payload.jobDescription || opportunity?.description || ""}

Please output ONLY the CV content formatted as plain text. Use section headers: CONTACT INFORMATION, PROFESSIONAL SUMMARY, WORK EXPERIENCE, EDUCATION, SKILLS, CERTIFICATIONS, PROJECTS (if any), LANGUAGES, REFERENCES.`;

  const buildCoverLetterPrompt = () => `You are an expert cover letter writer for the Nigerian job market. Write a professional, compelling, one-page cover letter tailored to the role of "${payload.jobTitle || opportunity?.title || payload.targetRole}" at "${payload.companyName || opportunity?.provider || "the organization"}. Make it personal, show genuine interest, and connect the candidate's experience to the role requirements. Use a professional but warm tone suitable for Nigerian employers.

CANDIDATE:
Name: ${profileFullName}
Email: ${profileEmail}
Phone: ${profilePhone}
Location: ${profileLocation}

ROLE CONTEXT:
Target Role: ${payload.targetRole}
Job Title: ${payload.jobTitle || opportunity?.title || payload.targetRole}
Company: ${payload.companyName || opportunity?.provider || "the hiring team"}
Job Description: ${payload.jobDescription || opportunity?.description || ""}

CANDIDATE BACKGROUND SUMMARY:
- Education: ${profile.highest_qualification || ""} ${profile.field_of_study || ""} ${profile.institution ? "at " + profile.institution : ""}
- Career Status: ${profile.career_statuses?.join(", ") || "Professional"}
- Skills: ${mergedSkills.slice(0, 8).join(", ") || payload.strengths || "Strong communication, teamwork, problem solving"}
- Experience Notes: ${payload.workHistory || cvData?.workExperience?.map(e => e.role + " at " + e.company).join(", ") || "Growing professional background"}
- Achievements: ${payload.achievements || cvData?.projects?.map(p => p.name).join(", ") || "Strong academic and project results"}
- ${payload.additionalInstructions || ""}

Please output ONLY the cover letter. Start with "Dear [Hiring Manager / Recruitment Team," end with "Sincerely," followed by the candidate's name. Make it 3-4 paragraphs, no more than 400 words.`;

  try {
    const results = await Promise.all([
      payload.documentType === "cv" || payload.documentType === "both"
        ? callGroq(buildCVPrompt(), "You are a professional CV writer. Respond with plain text only, no markdown or commentary.")
        : Promise.resolve(null),
      payload.documentType === "cover_letter" || payload.documentType === "both"
        ? callGroq(buildCoverLetterPrompt(), "You are a professional cover letter writer. Respond with plain text only, no markdown or commentary.")
        : Promise.resolve(null),
    ]);

    const cvResult = results[0];
    const clResult = results[1];

    return {
      cv: cvResult?.content || buildFallbackDocuments(profile, payload, opportunity).cv,
      coverLetter: clResult?.content || buildFallbackDocuments(profile, payload, opportunity).coverLetter,
      provider: "groq",
      aiModel: GROQ_MODEL,
      tokensUsed: (cvResult?.tokens || 0) + (clResult?.tokens || 0),
    };
  } catch (groqError) {
    console.error("Groq API call failed, using fallback builder:", groqError);
    return {
      ...buildFallbackDocuments(profile, payload, opportunity),
      provider: "groq",
      aiModel: "fallback-template",
      tokensUsed: 0,
    };
  }
}

async function callGroq(userPrompt: string, systemPrompt: string): Promise<{ content: string; tokens: number }> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Groq API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content?.trim() || "",
    tokens: data.usage?.total_tokens || 0,
  };
}

function buildFallbackDocuments(
  profile: ProfileRow,
  payload: BuilderRequest,
  opportunity: OpportunityRow | null,
): Pick<BuilderResponse, "cv" | "coverLetter"> {
  const cvData = payload.cvData;
  const fullName = cvData?.personalInfo?.fullName || profile.full_name || "Your Name";
  const email = cvData?.personalInfo?.email || profile.email || "";
  const phone = cvData?.personalInfo?.phone || profile.phone_number || "";
  const location = cvData?.personalInfo?.location || [profile.state, profile.country].filter(Boolean).join(", ") || "Nigeria";
  const linkedin = cvData?.personalInfo?.linkedin || "";
  const website = cvData?.personalInfo?.website || "";

  const mergedSkills = Array.from(new Set([
    ...(cvData?.skills || []),
    ...(profile.skills || []),
  ]));

  const contactLine = [email, phone, location, linkedin, website].filter(Boolean).join(" | ");

  const workExpText = (cvData?.workExperience && cvData.workExperience.length > 0)
    ? cvData.workExperience.map(exp => `${exp.role.toUpperCase()} AT ${exp.company.toUpperCase()}  ${exp.startDate} - ${exp.current ? "PRESENT" : exp.endDate}\n${exp.description}`).join("\n\n")
    : (payload.workHistory?.trim() || "Add your recent work, internship, volunteer, or leadership experience here.");

  const eduText = (cvData?.education && cvData.education.length > 0)
    ? cvData.education.map(edu => `${edu.degree} in ${edu.field} - ${edu.institution}\n${edu.startDate} - ${edu.endDate}\n${edu.description}`).join("\n\n")
    : [profile.highest_qualification, profile.field_of_study, profile.institution].filter(Boolean).join(" in ") + (profile.graduation_year ? ` (${profile.graduation_year})` : "");

  const certsText = (cvData?.certificationsList && cvData.certificationsList.length > 0)
    ? cvData.certificationsList.map(c => `- ${c.name} — ${c.issuer} (${c.date})`).join("\n")
    : (payload.certifications?.trim() || "List relevant certifications, courses, or training here.");

  const projectsText = (cvData?.projects && cvData.projects.length > 0)
    ? cvData.projects.map(p => `${p.name.toUpperCase()}\n${p.description}\nTechnologies: ${p.technologies}\nLink: ${p.link}`).join("\n\n")
    : (payload.achievements?.trim() || "");

  const langsText = (cvData?.languages && cvData.languages.length > 0)
    ? cvData.languages.map(l => `- ${l.language} (${l.proficiency})`).join("\n")
    : "- English (Fluent)";

  const refsText = (cvData?.references && cvData.references.length > 0)
    ? cvData.references.map(r => `${r.name}, ${r.position} — ${r.company}\nContact: ${r.contact}`).join("\n\n")
    : "Available on request";

  const opportunityTitle = payload.jobTitle?.trim() || opportunity?.title || payload.targetRole;
  const opportunityCompany = payload.companyName?.trim() || opportunity?.provider || "the hiring team";
  const skillsStr = mergedSkills.join(", ") || "Communication, problem solving, teamwork";

  const cv = `${fullName.toUpperCase()}
${cvData?.personalInfo?.title || payload.targetRole}
${contactLine || "Add your email, phone number, and location"}

PROFESSIONAL SUMMARY
${cvData?.professionalSummary?.trim() || `Results-oriented ${payload.targetRole} professional with ${payload.yearsExperience || "a strong"} background. Skilled in ${skillsStr}. Passionate about delivering impact in ${location}.

CORE COMPETENCIES
${skillsStr}

WORK EXPERIENCE
${workExpText}

EDUCATION
${eduText}

SKILLS
${skillsStr}

CERTIFICATIONS
${certsText}
${projectsText ? `\nPROJECTS & ACHIEVEMENTS\n${projectsText}\n` : ""}
LANGUAGES
${langsText}

REFERENCES
${refsText}`.trim();

  const coverLetter = `Dear ${opportunityCompany},

I am writing to express my strong interest in the ${opportunityTitle} position. With a ${profile.highest_qualification || "solid educational background"} in ${profile.field_of_study || "my field"} and practical experience in ${skillsStr}, I am confident I can make a valuable contribution to your organization.

Throughout my career, I have ${payload.workHistory?.trim() || "developed strong skills through academic projects, volunteer work, and team collaborations"}. I am particularly proud of ${payload.achievements?.trim() || "consistently meeting challenges with dedication and creative problem-solving"}. These experiences have sharpened my abilities in execution, stakeholder communication, and results delivery.

What excites me most about this opportunity is the chance to bring my expertise as a ${payload.targetRole} to ${opportunity?.description || payload.jobDescription ? "while contributing to your organization's mission of impactful work." : "."} My background aligns well with this role through my ${profile.career_statuses?.join(", ") || "professional approach to work"}, interest in ${profile.preferred_industries?.join(", ") || "organizational growth"}, and commitment to excellence.

${payload.additionalInstructions?.trim() || "I would welcome the opportunity to discuss how my background, skills, and enthusiasm can support your team's goals."}

Thank you for your time and consideration. I look forward to hearing from you.

Sincerely,
${fullName}
${email}  |  ${phone}`.trim();

  return { cv, coverLetter };
}

function jsonResponse<T>(body: T, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  };
}

serve(handler);
