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
    <section className="py-16 bg-muted/50">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <h2 className="text-3xl font-bold text-center">{title}</h2>
        <Tabs defaultValue="consumer" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="consumer" className="gap-2">
              <UserRound className="h-4 w-4" />
              {tabConsumer}
            </TabsTrigger>
            <TabsTrigger value="farmer" className="gap-2">
              <Tractor className="h-4 w-4" />
              {tabFarmer}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="consumer" className="mt-6">
            <StepList steps={consumerSteps} />
          </TabsContent>
          <TabsContent value="farmer" className="mt-6">
            <StepList steps={farmerSteps} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-6">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4 items-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            {i + 1}
          </div>
          <div>
            <p className="font-semibold">{step.title}</p>
            <p className="text-muted-foreground text-sm mt-1">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
