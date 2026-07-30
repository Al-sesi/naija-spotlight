import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";
import { useIsPremium } from "./useSubscription";

type Opportunity = Tables<"opportunities">;
type OpportunityMetadata = Tables<"opportunity_metadata">;
type Profile = Tables<"profiles">;
type UserBehavior = Tables<"user_behavior">;

const MINIMUM_MATCH_SCORE = 25;
const QUALIFICATION_ORDER = [
  "ssce",
  "ond",
  "hnd",
  "bachelor's degree",
  "master's degree",
  "phd",
] as const;

const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  scholarships: ["scholarship"],
  grants: ["grant", "ngo"],
  jobs: ["job", "recruitment", "career", "government"],
  "remote jobs": ["job", "recruitment", "career", "internship"],
  internships: ["internship"],
  fellowships: ["internship", "career"],
  competitions: ["competition"],
  hackathons: ["competition", "tech"],
  accelerators: ["grant", "ngo", "competition", "career"],
  "government programs": ["government", "recruitment"],
  "ngo opportunities": ["grant", "ngo"],
  "business funding": ["grant", "ngo", "competition"],
  conferences: ["tech", "social"],
  bootcamps: ["tech", "career"],
  "volunteer programs": ["social", "grant", "ngo"],
  "free courses": ["tech", "career"],
  "research opportunities": ["scholarship", "career"],
  events: ["social", "tech"],
};

const CAREER_STATUS_CATEGORY_MAP: Record<string, string[]> = {
  student: ["scholarship", "internship", "competition", "tech"],
  graduate: ["job", "recruitment", "career", "internship"],
  "nysc member": ["internship", "job", "recruitment", "career"],
  "job seeker": ["job", "recruitment", "career"],
  entrepreneur: ["grant", "ngo", "competition", "career"],
  freelancer: ["career", "job", "tech"],
  professional: ["career", "job", "recruitment"],
  "ngo worker": ["grant", "ngo"],
  researcher: ["scholarship", "career"],
  farmer: ["grant", "ngo", "career"],
  creative: ["social", "career"],
  developer: ["tech", "internship", "career", "job"],
};

const CAREER_STATUS_KEYWORDS: Record<string, string[]> = {
  entrepreneur: ["startup", "accelerator", "grant", "funding", "business"],
  freelancer: ["remote", "contract", "gig"],
  researcher: ["research", "fellowship", "lab"],
  creative: ["design", "media", "content", "creative"],
  developer: ["developer", "software", "engineering", "tech"],
  farmer: ["agriculture", "agric", "farm"],
};

export interface MatchResult {
  opportunity: Opportunity;
  score: number;
  reasons: string[];
}

interface OpportunityMatchingResult {
  matches: MatchResult[];
  profileCompleted: boolean;
  isPremium: boolean;
}

export function useOpportunityMatching() {
  const { user } = useAuth();
  const { isPremium } = useIsPremium();

  const query = useQuery({
    queryKey: ["opportunity-matching", user?.id, isPremium],
    enabled: !!user,
    queryFn: async (): Promise<OpportunityMatchingResult> => {
      if (!user) {
        return { matches: [], profileCompleted: false, isPremium: false };
      }

      // AI Matching is a premium feature — free users do not get personalized matches
      if (!isPremium) {
        return { matches: [], profileCompleted: true, isPremium: false };
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        return { matches: [], profileCompleted: false, isPremium: true };
      }

      const { data: opportunities, error: opportunitiesError } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });

      if (opportunitiesError) {
        throw opportunitiesError;
      }

      const { data: metadataRows, error: metadataError } = await supabase
        .from("opportunity_metadata")
        .select("*");

      if (metadataError) {
        throw metadataError;
      }

      const { data: behavior, error: behaviorError } = await supabase
        .from("user_behavior")
        .select("*")
        .eq("user_id", user.id);

      if (behaviorError) {
        throw behaviorError;
      }

      const metadataByOpportunityId = new Map(
        (metadataRows ?? []).map((metadata) => [metadata.opportunity_id, metadata]),
      );

      const matches = (opportunities ?? [])
        .map((opportunity) =>
          calculateMatch(
            profile,
            opportunity,
            metadataByOpportunityId.get(opportunity.id) ?? null,
            behavior ?? [],
          ),
        )
        .filter((match) => match.score >= MINIMUM_MATCH_SCORE)
        .sort((left, right) => right.score - left.score);

      return {
        matches,
        profileCompleted: profile.onboarding_completed === true,
        isPremium: true,
      };
    },
  });

  return {
    matches: query.data?.matches ?? [],
    profileCompleted: query.data?.profileCompleted ?? false,
    isPremium: query.data?.isPremium ?? isPremium,
    loading: query.isLoading,
  };
}

function calculateMatch(
  profile: Profile,
  opportunity: Opportunity,
  metadata: OpportunityMetadata | null,
  behavior: UserBehavior[],
): MatchResult {
  if (isExpired(opportunity.deadline)) {
    return {
      opportunity,
      score: 0,
      reasons: ["Deadline has passed"],
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const searchableText = buildSearchableText(opportunity, metadata);

  const interestMatches = getInterestMatches(profile.interests ?? [], opportunity, searchableText);
  if (interestMatches.length > 0) {
    score += Math.min(24, interestMatches.length * 8);
    reasons.push(`Matches your interests: ${interestMatches.slice(0, 2).join(", ")}`);
  }

  const skillMatches = getSkillMatches(profile.skills ?? [], searchableText);
  if (skillMatches.length > 0) {
    score += Math.min(24, skillMatches.length * 8);
    reasons.push(`Uses your skills: ${skillMatches.slice(0, 3).join(", ")}`);
  }

  const industryMatch = getIndustryMatch(profile.preferred_industries ?? [], metadata?.industry, searchableText);
  if (industryMatch) {
    score += 12;
    reasons.push(`Aligned with your preferred industry: ${industryMatch}`);
  }

  const educationReason = getEducationReason(profile.highest_qualification, metadata?.education_requirement);
  if (educationReason.type === "matched") {
    score += 10;
    reasons.push(educationReason.reason);
  } else if (educationReason.type === "missing") {
    score -= 10;
  }

  const careerMatches = getCareerStatusMatches(profile.career_statuses ?? [], opportunity, searchableText);
  if (careerMatches.length > 0) {
    score += Math.min(14, careerMatches.length * 7);
    reasons.push(`Fits your background: ${careerMatches.slice(0, 2).join(", ")}`);
  }

  const locationReason = getLocationReason(profile.preferred_location, opportunity);
  if (locationReason) {
    score += 12;
    reasons.push(locationReason);
  }

  if (profile.opportunity_level && opportunity.level) {
    if (normalizeText(profile.opportunity_level) === normalizeText(opportunity.level)) {
      score += 8;
      reasons.push("Matches your preferred opportunity level");
    }
  }

  if (opportunity.is_verified) {
    score += 8;
    reasons.push("This is a verified opportunity");
  }

  if (opportunity.is_remote && wantsRemote(profile.interests ?? [], profile.preferred_location)) {
    score += 8;
    reasons.push("Supports your remote-work preference");
  }

  if (opportunity.deadline) {
    score += 4;
    reasons.push("Deadline is still open");
  }

  const opportunityBehavior = behavior.filter((entry) => entry.opportunity_id === opportunity.id);
  if (opportunityBehavior.length > 0) {
    const hasApplied = opportunityBehavior.some((entry) => entry.action_type === "apply");
    const hasSaved = opportunityBehavior.some((entry) => entry.action_type === "save");
    const hasClicked = opportunityBehavior.some((entry) => entry.action_type === "click");
    const hasViewed = opportunityBehavior.some((entry) => entry.action_type === "view");
    const hasIgnored = opportunityBehavior.some((entry) => entry.action_type === "ignore");

    if (hasApplied) {
      score += 18;
      reasons.push("You've already shown strong interest in this opportunity");
    } else if (hasSaved) {
      score += 12;
      reasons.push("You saved a similar opportunity before");
    } else if (hasClicked) {
      score += 6;
      reasons.push("You often click opportunities like this");
    } else if (hasViewed) {
      score += 3;
    }

    if (hasIgnored) {
      score -= 8;
    }
  }

  score = Math.max(0, Math.min(score, 100));

  return {
    opportunity,
    score,
    reasons: Array.from(new Set(reasons)).slice(0, 4),
  };
}

function buildSearchableText(opportunity: Opportunity, metadata: OpportunityMetadata | null) {
  return normalizeText(
    [
      opportunity.title,
      opportunity.provider,
      opportunity.description,
      opportunity.category,
      opportunity.level,
      metadata?.industry,
      metadata?.education_requirement,
      metadata?.eligibility_requirements,
      metadata?.location_requirement,
      metadata?.tags?.join(" "),
      metadata?.keywords?.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getInterestMatches(interests: string[], opportunity: Opportunity, searchableText: string) {
  return interests.filter((interest) => {
    const normalizedInterest = normalizeText(interest);
    const mappedCategories = INTEREST_CATEGORY_MAP[normalizedInterest] ?? [];

    if (mappedCategories.includes(opportunity.category)) {
      return true;
    }

    if (normalizedInterest === "remote jobs") {
      return opportunity.is_remote === true;
    }

    return searchableText.includes(normalizedInterest);
  });
}

function getSkillMatches(skills: string[], searchableText: string) {
  return skills.filter((skill) => searchableText.includes(normalizeText(skill)));
}

function getIndustryMatch(
  preferredIndustries: string[],
  opportunityIndustry: string | null,
  searchableText: string,
) {
  return preferredIndustries.find((industry) => {
    const normalizedIndustry = normalizeText(industry);
    return (
      normalizeText(opportunityIndustry).includes(normalizedIndustry) ||
      searchableText.includes(normalizedIndustry)
    );
  });
}

function getEducationReason(
  highestQualification: string | null,
  educationRequirement: string | null,
): { type: "matched" | "missing" | "neutral"; reason: string } {
  if (!educationRequirement || !highestQualification) {
    return { type: "neutral", reason: "" };
  }

  const userRank = getQualificationRank(highestQualification);
  const requirementRank = getQualificationRank(educationRequirement);

  if (userRank === null || requirementRank === null) {
    return { type: "neutral", reason: "" };
  }

  if (userRank >= requirementRank) {
    return {
      type: "matched",
      reason: `Fits your education level (${highestQualification})`,
    };
  }

  return {
    type: "missing",
    reason: `Needs a higher qualification than ${highestQualification}`,
  };
}

function getCareerStatusMatches(careerStatuses: string[], opportunity: Opportunity, searchableText: string) {
  return careerStatuses.filter((status) => {
    const normalizedStatus = normalizeText(status);
    const mappedCategories = CAREER_STATUS_CATEGORY_MAP[normalizedStatus] ?? [];
    const mappedKeywords = CAREER_STATUS_KEYWORDS[normalizedStatus] ?? [];

    if (mappedCategories.includes(opportunity.category)) {
      return true;
    }

    return mappedKeywords.some((keyword) => searchableText.includes(keyword));
  });
}

function getLocationReason(preferredLocation: string | null, opportunity: Opportunity) {
  switch (preferredLocation) {
    case "Remote Only":
      return opportunity.is_remote ? "Matches your preferred remote location" : null;
    case "Nigeria Only":
      return opportunity.state ? "Available within your preferred location" : null;
    case "Africa":
      return opportunity.state || opportunity.is_remote ? "Accessible across your preferred region" : null;
    case "Worldwide":
      return "Fits your worldwide opportunity preference";
    default:
      return null;
  }
}

function wantsRemote(interests: string[], preferredLocation: string | null) {
  return preferredLocation === "Remote Only" || interests.some((interest) => normalizeText(interest) === "remote jobs");
}

function isExpired(deadline: string | null) {
  if (!deadline) {
    return false;
  }

  return new Date(deadline) <= new Date();
}

function getQualificationRank(value: string) {
  const normalizedValue = normalizeText(value);
  const rank = QUALIFICATION_ORDER.findIndex((qualification) => normalizedValue.includes(qualification));
  return rank === -1 ? null : rank;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
