import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { 
  Zap, 
  GraduationCap, 
  Briefcase, 
  Award, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Star,
  Heart,
  Sparkles,
  Search
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: CheckCircle2,
    title: "100% Verified",
    description: "Every opportunity is manually verified to ensure legitimacy and quality."
  },
  {
    icon: Zap,
    title: "Instant Alerts",
    description: "Get notified immediately when new opportunities match your preferences."
  },
  {
    icon: GraduationCap,
    title: "Scholarships",
    description: "Find funding for your education from local and international sources."
  },
  {
    icon: Briefcase,
    title: "Jobs & Internships",
    description: "Kickstart your career with opportunities from top organizations in Nigeria."
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with other ambitious Nigerians and share success stories."
  },
  {
    icon: Search,
    title: "Smart Search",
    description: "Find exactly what you're looking for with AI-enhanced search capabilities."
  }
];

const stats = [
  { number: "10,000+", label: "Active Users" },
  { number: "5,000+", label: "Verified Opportunities" },
  { number: "2,500+", label: "Success Stories" },
  { number: "100%", label: "Verified Listings" }
];

const testimonials = [
  {
    name: "Aisha Bello",
    role: "Computer Science Student",
    avatar: "https://coresg-normal.trae.ai/api/v1/text_to_image?prompt=professional%20portrait%20of%20a%20young%20Nigerian%20woman%20smiling%20confidently%2C%20headshot%2C%20neutral%20background&image_size=square",
    quote: "I got my first internship through NaijaLift! The AI recommendations were spot on."
  },
  {
    name: "Chidera Okafor",
    role: "Recent Graduate",
    avatar: "https://coresg-normal.trae.ai/api/v1/text_to_image?prompt=professional%20portrait%20of%20a%20young%20Nigerian%20man%20in%20business%20attire%2C%20headshot&image_size=square",
    quote: "The scholarship search saved me months of looking. I found the perfect grant for my master's."
  },
  {
    name: "Emmanuel Adebayo",
    role: "Tech Professional",
    avatar: "https://coresg-normal.trae.ai/api/v1/text_to_image?prompt=professional%20portrait%20of%20a%20smiling%20Nigerian%20tech%20professional%20in%20casual%20wear&image_size=square",
    quote: "NaijaLift connected me to amazing opportunities I would never have found on my own."
  }
];

export default function Index() {
  const { user, session } = useAuth();
  const isEmailConfirmed = session?.user?.email_confirmed_at != null;
  const aiMatchingHref = user && isEmailConfirmed ? "/dashboard" : "/auth";

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero py-16 md:py-24 lg:py-32">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              <span>Trusted by 10,000+ Nigerians</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-4 sm:mb-6 leading-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              Unlock Your Future <br className="hidden sm:block" />
              <span className="text-primary">One Opportunity at a Time</span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-10 px-2 sm:px-0">
              NaijaLift brings verified scholarships, jobs, grants, and opportunities together in one place. 
              Let AI help you find what's perfect for you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Button asChild size="lg" className="w-full sm:w-auto text-sm sm:text-base h-11 sm:h-12 px-6 sm:px-8">
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-sm sm:text-base h-11 sm:h-12 px-6 sm:px-8 bg-card">
                <Link to="/opportunities">
                  Browse Opportunities
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 sm:py-12 bg-card border-y border-border/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center px-2">
                <div className="text-2xl sm:text-3xl md:text-5xl font-display font-bold text-primary mb-1 sm:mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground font-medium text-xs sm:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI-Powered Matching Section (Dedicated) */}
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="container px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>AI-Powered</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-3 sm:mb-4">
              Find Your Perfect Match
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Smart matches tailored to your goals.
            </p>
          </div>
          
          <div className="text-center">
            <Button asChild size="lg" className="w-full sm:w-auto text-sm sm:text-base h-11 sm:h-12 px-6 sm:px-8">
              <Link to={aiMatchingHref}>
                Try AI Matching Now
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="container px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-3 sm:mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              We've built NaijaLift to be your ultimate platform for growth and opportunity.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="p-5 sm:p-6 md:p-8 hover:shadow-lg transition-all duration-300 group bg-card">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
        <div className="container px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-3 sm:mb-4">
              Loved by Nigerians
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Here's what our amazing community has to say.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="p-5 sm:p-6 md:p-8 bg-card">
                <div className="flex gap-1 mb-4 sm:mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-foreground mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3 sm:gap-4">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name} 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-foreground text-sm sm:text-base">
                      {testimonial.name}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="container px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 border border-primary/20">
            <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-4 sm:mb-6" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-3 sm:mb-4">
              Ready to Transform Your Future?
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8">
              Join thousands of Nigerians who are already finding amazing opportunities on NaijaLift. 
              Create your free account today.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto text-sm sm:text-base h-11 sm:h-12 px-6 sm:px-8">
              <Link to="/auth">
                Create Free Account
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
