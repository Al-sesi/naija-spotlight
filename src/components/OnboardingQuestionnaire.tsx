import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MapPin,
  GraduationCap,
  Briefcase,
  Award,
  Heart,
  Globe,
  Sparkles,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
} from "lucide-react";
import {
  CAREER_STATUSES,
  SKILLS,
  INTERESTS,
  PREFERRED_LOCATIONS,
  INDUSTRIES,
  OPPORTUNITY_LEVELS,
  NOTIFICATION_FREQUENCIES,
  HIGHEST_QUALIFICATIONS,
} from "@/lib/onboarding-constants";

interface OnboardingData {
  phoneNumber: string;
  gender: string;
  age: number | null;
  dateOfBirth: string;
  country: string;
  state: string;
  lga: string;
  highestQualification: string;
  fieldOfStudy: string;
  institution: string;
  isCurrentStudent: boolean;
  graduationYear: number | null;
  careerStatuses: string[];
  skills: string[];
  customSkills: string[];
  interests: string[];
  preferredLocation: string;
  preferredIndustries: string[];
  opportunityLevel: string;
  notificationFrequency: string;
}

const initialOnboardingData: OnboardingData = {
  phoneNumber: "",
  gender: "",
  age: null,
  dateOfBirth: "",
  country: "Nigeria",
  state: "",
  lga: "",
  highestQualification: "",
  fieldOfStudy: "",
  institution: "",
  isCurrentStudent: false,
  graduationYear: null,
  careerStatuses: [],
  skills: [],
  customSkills: [],
  interests: [],
  preferredLocation: "",
  preferredIndustries: [],
  opportunityLevel: "",
  notificationFrequency: "Daily",
};

const totalSteps = 7;

export default function OnboardingQuestionnaire() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [newCustomSkill, setNewCustomSkill] = useState("");

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const updateData = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSkill = (skill: string) => {
    setData((prev) => {
      if (prev.skills.includes(skill)) {
        return { ...prev, skills: prev.skills.filter((s) => s !== skill) };
      } else {
        return { ...prev, skills: [...prev.skills, skill] };
      }
    });
  };

  const addCustomSkill = () => {
    if (
      newCustomSkill.trim() &&
      !data.customSkills.includes(newCustomSkill.trim()) &&
      !data.skills.includes(newCustomSkill.trim())
    ) {
      setData((prev) => ({
        ...prev,
        customSkills: [...prev.customSkills, newCustomSkill.trim()],
        skills: [...prev.skills, newCustomSkill.trim()],
      }));
      setNewCustomSkill("");
    }
  };

  const removeCustomSkill = (skill: string) => {
    setData((prev) => ({
      ...prev,
      customSkills: prev.customSkills.filter((s) => s !== skill),
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const toggleCareerStatus = (status: string) => {
    setData((prev) => {
      if (prev.careerStatuses.includes(status)) {
        return { ...prev, careerStatuses: prev.careerStatuses.filter((s) => s !== status) };
      } else {
        return { ...prev, careerStatuses: [...prev.careerStatuses, status] };
      }
    });
  };

  const toggleInterest = (interest: string) => {
    setData((prev) => {
      if (prev.interests.includes(interest)) {
        return { ...prev, interests: prev.interests.filter((i) => i !== interest) };
      } else {
        return { ...prev, interests: [...prev.interests, interest] };
      }
    });
  };

  const toggleIndustry = (industry: string) => {
    setData((prev) => {
      if (prev.preferredIndustries.includes(industry)) {
        return { ...prev, preferredIndustries: prev.preferredIndustries.filter((i) => i !== industry) };
      } else {
        return { ...prev, preferredIndustries: [...prev.preferredIndustries, industry] };
      }
    });
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return data.country && data.state;
      case 2:
        return data.highestQualification;
      case 3:
        return data.careerStatuses.length > 0;
      case 4:
        return data.skills.length > 0;
      case 5:
        return data.interests.length > 0;
      case 6:
        return data.preferredLocation && data.preferredIndustries.length > 0 && data.opportunityLevel;
      default:
        return true;
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email ?? null,
          full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          phone_number: data.phoneNumber,
          gender: data.gender,
          age: data.age,
          date_of_birth: data.dateOfBirth || null,
          country: data.country,
          state: data.state,
          lga: data.lga,
          highest_qualification: data.highestQualification,
          field_of_study: data.fieldOfStudy,
          institution: data.institution,
          is_current_student: data.isCurrentStudent,
          graduation_year: data.graduationYear,
          career_statuses: data.careerStatuses,
          skills: data.skills,
          interests: data.interests,
          preferred_location: data.preferredLocation,
          preferred_industries: data.preferredIndustries,
          opportunity_level: data.opportunityLevel,
          notification_frequency: data.notificationFrequency,
          onboarding_completed: true,
        });

      if (error) throw error;
      toast.success("Profile completed! Welcome to NaijaLift!");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Failed to complete onboarding";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Personal & Location</h3>
                <p className="text-muted-foreground text-sm">Tell us a bit about yourself</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number (Optional)</Label>
                <Input
                  placeholder="+234 812 345 6789"
                  value={data.phoneNumber}
                  onChange={(e) => updateData("phoneNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender (Optional)</Label>
                <Select value={data.gender} onValueChange={(v) => updateData("gender", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={data.country} onValueChange={(v) => updateData("country", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                    <SelectItem value="Ghana">Ghana</SelectItem>
                    <SelectItem value="South Africa">South Africa</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  placeholder="e.g. Lagos"
                  value={data.state}
                  onChange={(e) => updateData("state", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Local Government Area (Optional)</Label>
              <Input
                placeholder="e.g. Eti-Osa"
                value={data.lga}
                onChange={(e) => updateData("lga", e.target.value)}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Education</h3>
                <p className="text-muted-foreground text-sm">Your educational background</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Highest Qualification</Label>
              <Select
                value={data.highestQualification}
                onValueChange={(v) => updateData("highestQualification", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select qualification" />
                </SelectTrigger>
                <SelectContent>
                  {HIGHEST_QUALIFICATIONS.map((qual) => (
                    <SelectItem key={qual} value={qual}>{qual}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field of Study (Optional)</Label>
                <Input
                  placeholder="e.g. Computer Science"
                  value={data.fieldOfStudy}
                  onChange={(e) => updateData("fieldOfStudy", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Institution (Optional)</Label>
                <Input
                  placeholder="e.g. University of Lagos"
                  value={data.institution}
                  onChange={(e) => updateData("institution", e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Checkbox
                  id="current-student"
                  checked={data.isCurrentStudent}
                  onCheckedChange={(v) => updateData("isCurrentStudent", v === true)}
                />
                <Label htmlFor="current-student" className="cursor-pointer">I'm currently a student</Label>
              </div>
              <div className="space-y-2">
                <Label>Graduation Year (Optional)</Label>
                <Input
                  type="number"
                  placeholder="2024"
                  value={data.graduationYear || ""}
                  onChange={(e) => updateData("graduationYear", Number(e.target.value) || null)}
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Career</h3>
                <p className="text-muted-foreground text-sm">Select all that apply</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {CAREER_STATUSES.map((status) => (
                <div
                  key={status}
                  onClick={() => toggleCareerStatus(status)}
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    data.careerStatuses.includes(status)
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/50"
                  }`}
                >
                  {data.careerStatuses.includes(status) ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-input" />
                  )}
                  <span className="font-medium">{status}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Skills</h3>
                <p className="text-muted-foreground text-sm">What are you good at?</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Add custom skill</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Photography"
                  value={newCustomSkill}
                  onChange={(e) => setNewCustomSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomSkill()}
                />
                <Button onClick={addCustomSkill} className="shrink-0">
                  <Plus className="h-4 w-4 mr-2" />Add
                </Button>
              </div>
            </div>

            {data.customSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.customSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="px-3 py-1 flex items-center gap-2"
                  >
                    {skill}
                    <button
                      onClick={() => removeCustomSkill(skill)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Select from popular skills</Label>
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="grid md:grid-cols-2 gap-2">
                  {SKILLS.map((skill) => (
                    <div
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        data.skills.includes(skill)
                          ? "border-primary bg-primary/5"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      {data.skills.includes(skill) ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-input" />
                      )}
                      <span className="text-sm">{skill}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Interests</h3>
                <p className="text-muted-foreground text-sm">What opportunities are you looking for?</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {INTERESTS.map((interest) => (
                <div
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    data.interests.includes(interest)
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/50"
                  }`}
                >
                  {data.interests.includes(interest) ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-input" />
                  )}
                  <span className="font-medium">{interest}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Preferences</h3>
                <p className="text-muted-foreground text-sm">Customize your opportunities</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Location</Label>
              <RadioGroup
                value={data.preferredLocation}
                onValueChange={(v) => updateData("preferredLocation", v)}
              >
                <div className="grid md:grid-cols-2 gap-2">
                  {PREFERRED_LOCATIONS.map((loc) => (
                    <div key={loc} className="flex items-center gap-2 p-3 border rounded-lg">
                      <RadioGroupItem value={loc} id={`loc-${loc}`} />
                      <Label htmlFor={`loc-${loc}`} className="cursor-pointer flex-1">{loc}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Preferred Industries (Select all that apply)</Label>
              <ScrollArea className="h-48 border rounded-lg p-4">
                <div className="grid md:grid-cols-2 gap-2">
                  {INDUSTRIES.map((industry) => (
                    <div
                      key={industry}
                      onClick={() => toggleIndustry(industry)}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        data.preferredIndustries.includes(industry)
                          ? "border-primary bg-primary/5"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      {data.preferredIndustries.includes(industry) ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-input" />
                      )}
                      <span className="text-sm">{industry}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label>Opportunity Level</Label>
              <Select
                value={data.opportunityLevel}
                onValueChange={(v) => updateData("opportunityLevel", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">You're all set!</h3>
              <p className="text-muted-foreground">Let's set up your notifications</p>
            </div>
            <div className="max-w-md mx-auto">
              <div className="space-y-2 mb-6">
                <Label>Notification Frequency</Label>
                <Select
                  value={data.notificationFrequency}
                  onValueChange={(v) => updateData("notificationFrequency", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_FREQUENCIES.map((freq) => (
                      <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 text-left p-6 border rounded-lg bg-muted/30">
                <h4 className="font-semibold flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  What happens next?
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• AI will recommend opportunities just for you</li>
                  <li>• Daily personalized feed updates</li>
                  <li>• Notifications for new matches</li>
                  <li>• Easy application tracking</li>
                </ul>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm text-muted-foreground">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          </div>
          <CardTitle className="text-2xl font-display">Complete Your Profile</CardTitle>
          <CardDescription>Let's personalize your NaijaLift experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {renderStep()}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            {currentStep === totalSteps ? (
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? "Saving..." : "Complete Setup"}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep((prev) => Math.min(totalSteps, prev + 1))}
                disabled={!validateStep()}
                className="ml-auto"
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
