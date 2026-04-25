"use client";

import { Suspense, lazy } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CircuitFlow from "@/components/CircuitFlow";
import FeaturesGrid from "@/components/FeaturesGrid";
import AgentSquad from "@/components/AgentSquad";
import RemediationSimulator from "@/components/RemediationSimulator";
import Footer from "@/components/Footer";

const NetworkMesh = lazy(() => import("@/components/NetworkMesh"));

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* 3D Background */}
      <Suspense fallback={null}>
        <NetworkMesh />
      </Suspense>

      {/* Content */}
      <Navbar />
      <HeroSection />
      <CircuitFlow />
      <FeaturesGrid />
      <AgentSquad />
      <RemediationSimulator />
      <Footer />
    </div>
  );
}
