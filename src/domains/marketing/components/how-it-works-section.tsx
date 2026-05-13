"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { UserRound, Tractor } from "lucide-react";

interface Step {
  title: string;
  desc: string;
}

interface HowItWorksSectionProps {
  title: string;
  tabConsumer: string;
  tabFarmer: string;
  consumerSteps: Step[];
  farmerSteps: Step[];
}

export function HowItWorksSection({
  title,
  tabConsumer,
  tabFarmer,
  consumerSteps,
  farmerSteps,
}: HowItWorksSectionProps) {
  return (
    <section className="py-20 bg-landing-dark text-landing-dark-foreground">
      <div className="max-w-3xl mx-auto px-4 space-y-10">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-center">
          {title}
        </h2>
        <Tabs defaultValue="consumer" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto bg-white/10 rounded-full p-1 gap-1">
            <TabsTrigger
              value="consumer"
              className="gap-1.5 py-2.5 text-xs sm:text-sm rounded-full text-landing-dark-foreground/60 data-[state=active]:bg-landing-dark-foreground data-[state=active]:text-landing-dark data-[state=active]:shadow-sm transition-all"
            >
              <UserRound className="h-3.5 w-3.5 flex-shrink-0" />
              {tabConsumer}
            </TabsTrigger>
            <TabsTrigger
              value="farmer"
              className="gap-1.5 py-2.5 text-xs sm:text-sm rounded-full text-landing-dark-foreground/60 data-[state=active]:bg-landing-dark-foreground data-[state=active]:text-landing-dark data-[state=active]:shadow-sm transition-all"
            >
              <Tractor className="h-3.5 w-3.5 flex-shrink-0" />
              {tabFarmer}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="consumer" className="mt-8">
            <StepList steps={consumerSteps} />
          </TabsContent>
          <TabsContent value="farmer" className="mt-8">
            <StepList steps={farmerSteps} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-8">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-5 items-start">
          <div className="flex-shrink-0 w-10 pt-0.5">
            <span className="font-display text-3xl font-bold text-golden leading-none">
              {i + 1}
            </span>
          </div>
          <div className="pt-1">
            <p className="font-display font-semibold text-landing-dark-foreground text-base leading-snug">
              {step.title}
            </p>
            <p className="text-landing-dark-foreground/70 text-sm mt-2 leading-relaxed">
              {step.desc}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
