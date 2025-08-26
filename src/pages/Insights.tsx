"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  BookOpen,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '@/lib/api';
import type { Insight } from '@/types/api';

// Helper function to render different types of insights
const renderInsightContent = (type: string, data: any) => {
  if (!data) return <p>No data available</p>;
  
  // Handle raw response format
  if (data.rawResponse) {
    return (
      <div className="space-y-4">
        <p className="text-yellow-300">The response couldn't be parsed as JSON. Here's the raw response:</p>
        <div className="bg-black/30 p-4 rounded-md">
          <pre className="whitespace-pre-wrap text-xs">{data.rawResponse.substring(0, 500)}...</pre>
        </div>
      </div>
    );
  }
  
  // Render based on insight type
  switch (type) {
    case 'opportunity':
      return data.opportunities ? (
        <div className="space-y-6">
          {data.opportunities.map((item: any, index: number) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">{item.title}</h3>
                <Badge className={item.impact === 'high' ? 'bg-green-500' : item.impact === 'medium' ? 'bg-blue-500' : 'bg-slate-500'}>
                  {item.impact} impact
                </Badge>
              </div>
              <p>{item.description}</p>
              <div className="text-sm opacity-80 italic border-l-2 border-white/20 pl-3 mt-1">
                Source: {item.source}
              </div>
              <div className="flex items-center gap-2 text-sm text-green-300 mt-2">
                <ArrowRight className="w-4 h-4" />
                <span>Measurement: {item.measurement}</span>
              </div>
            </div>
          ))}
        </div>
      ) : <p>No opportunities found</p>;
      
    case 'alert':
      return data.warnings ? (
        <div className="space-y-6">
          {data.warnings.map((item: any, index: number) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">{item.title}</h3>
                <Badge className={item.severity === 'high' ? 'bg-red-500' : item.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'}>
                  {item.severity} severity
                </Badge>
              </div>
              <p>{item.description}</p>
              <div className="text-sm opacity-80 italic border-l-2 border-white/20 pl-3 mt-1">
                Source: {item.source}
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-300 mt-2">
                <ArrowRight className="w-4 h-4" />
                <span>Mitigation: {item.mitigation}</span>
              </div>
            </div>
          ))}
        </div>
      ) : <p>No warnings found</p>;
      
    case 'insight':
      return data.insights ? (
        <div className="space-y-6">
          {data.insights.map((item: any, index: number) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">{item.title}</h3>
                <Badge className={item.relevance === 'high' ? 'bg-purple-500' : item.relevance === 'medium' ? 'bg-indigo-500' : 'bg-violet-500'}>
                  {item.relevance} relevance
                </Badge>
              </div>
              <p>{item.description}</p>
              <div className="text-sm opacity-80 italic border-l-2 border-white/20 pl-3 mt-1">
                Source: {item.source}
              </div>
              <div className="flex items-center gap-2 text-sm text-purple-300 mt-2">
                <ArrowRight className="w-4 h-4" />
                <span>Why it matters: {item.importance}</span>
              </div>
            </div>
          ))}
        </div>
      ) : <p>No insights found</p>;
      
    case 'recommendation':
      return data.recommendations ? (
        <div className="space-y-6">
          {data.recommendations.map((item: any, index: number) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">{item.title}</h3>
                <Badge className={item.priority === 'high' ? 'bg-blue-500' : item.priority === 'medium' ? 'bg-cyan-500' : 'bg-teal-500'}>
                  {item.priority} priority
                </Badge>
              </div>
              <p>{item.description}</p>
              <div className="text-sm opacity-80 italic border-l-2 border-white/20 pl-3 mt-1">
                Source: {item.source}
              </div>
              <div className="flex items-center gap-2 text-sm text-cyan-300 mt-2">
                <ArrowRight className="w-4 h-4" />
                <span>Implementation: {item.implementation}</span>
              </div>
            </div>
          ))}
        </div>
      ) : <p>No recommendations found</p>;
      
    case 'success':
      return data.successStories ? (
        <div className="space-y-6">
          {data.successStories.map((item: any, index: number) => (
            <div key={index} className="space-y-2">
              <h3 className="text-lg font-medium">{item.title}</h3>
              <p>{item.description}</p>
              <div className="text-sm opacity-80 italic border-l-2 border-white/20 pl-3 mt-1">
                Source: {item.source}
              </div>
              <div className="flex items-center gap-2 text-sm text-yellow-300 mt-2">
                <ArrowRight className="w-4 h-4" />
                <span>Key factors: {item.keyFactors}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-300 mt-1">
                <ArrowRight className="w-4 h-4" />
                <span>Lesson learned: {item.lesson}</span>
              </div>
            </div>
          ))}
        </div>
      ) : <p>No success stories found</p>;
      
    case 'analysis':
      return data.trends ? (
        <div className="space-y-6">
          {data.trends.map((item: any, index: number) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">{item.title}</h3>
                <Badge className={item.trajectory === 'growing' ? 'bg-emerald-500' : item.trajectory === 'stable' ? 'bg-blue-500' : 'bg-red-500'}>
                  {item.trajectory}
                </Badge>
              </div>
              <p>{item.description}</p>
              <div className="text-sm opacity-80 italic border-l-2 border-white/20 pl-3 mt-1">
                Source: {item.source}
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-300 mt-2">
                <ArrowRight className="w-4 h-4" />
                <span>Response: {item.response}</span>
              </div>
            </div>
          ))}
        </div>
      ) : <p>No trends found</p>;
      
    default:
      // Try to render any JSON structure
      return (
        <div className="space-y-4">
          {Object.entries(data).map(([key, value]: [string, any]) => {
            if (Array.isArray(value)) {
              return (
                <div key={key} className="space-y-4">
                  <h3 className="text-lg font-medium capitalize">{key}</h3>
                  {value.map((item: any, index: number) => (
                    <div key={index} className="border-l-2 border-white/20 pl-3 py-2">
                      {Object.entries(item).map(([itemKey, itemValue]: [string, any]) => (
                        <div key={itemKey} className="mb-2">
                          <span className="text-sm font-medium capitalize">{itemKey}: </span>
                          <span className="text-sm">{String(itemValue)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          })}
        </div>
      );
  }
};

type Card = {
  id: number;
  type: string;
  title: string;
  content: JSX.Element | React.ReactNode | string;
  className: string;
  thumbnail: string;
  color: string;
  icon: React.ReactNode;
};

export const LayoutGrid = ({ cards }: { cards: Card[] }) => {
  const [selected, setSelected] = useState<Card | null>(null);
  const [lastSelected, setLastSelected] = useState<Card | null>(null);
  const [loading, setLoading] = useState<number | null>(null);

  const handleClick = async (card: Card) => {
    setLastSelected(selected);
    
    // If we're clicking the same card, just close it
    if (selected?.id === card.id) {
      setSelected(null);
      return;
    }
    
    // Show loading state
    setLoading(card.id);
    
    try {
      console.log(`Generating insights for card type: ${card.type}`);
      
      // Get campaign data for context
      let campaignData;
      try {
        const campaignsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/campaigns`);
        campaignData = await campaignsResponse.json();
        console.log('Campaign data for context:', campaignData.slice(0, 2));
      } catch (error) {
        console.warn('Could not fetch campaign data:', error);
      }
      
      // Get analytics data for context
      let analyticsData;
      try {
        const analyticsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/analytics/stats`);
        analyticsData = await analyticsResponse.json();
        console.log('Analytics data for context:', analyticsData);
      } catch (error) {
        console.warn('Could not fetch analytics data:', error);
      }
      
      // Call the API to generate insights
      const response = await insightsApi.generateInsightFromEssays(card.type, campaignData, analyticsData);
      console.log(`Generated ${card.type} insights:`, response);
      
      // Update the card content with the generated insights
      const updatedCard = { 
        ...card,
        content: (
                        <div className="space-y-6 p-6 max-h-[80vh] overflow-y-auto">
                <h2 className="text-2xl font-bold">{card.title}</h2>
                <div className="prose prose-invert">
                  {renderInsightContent(card.type, response.response)}
                </div>
                <p className="text-sm opacity-70 mt-4 text-center">Generated from analysis of marketing expert essays</p>
              </div>
        )
      };
      
      setSelected(updatedCard);
    } catch (error) {
      console.error('Error generating insights:', error);
      
      // Get detailed error information
      let errorDetails = '';
      if (error.response) {
        try {
          // Try to get the response body
          const errorData = await error.response.json();
          console.error('Error response data:', errorData);
          errorDetails = JSON.stringify(errorData, null, 2);
        } catch (e) {
          errorDetails = `Status: ${error.response.status} ${error.response.statusText}`;
        }
      }
      
      // Show error in card
      const errorCard = {
        ...card,
        content: (
          <div className="space-y-4 py-4">
            <h2 className="text-2xl font-bold">{card.title}</h2>
            <p className="text-red-300">Error generating insights. Please try again.</p>
            <pre className="text-xs opacity-70 overflow-auto max-h-40 whitespace-pre-wrap">
              {error.toString()}
              {errorDetails && `\n\nDetails:\n${errorDetails}`}
            </pre>
          </div>
        )
      };
      
      setSelected(errorCard);
    } finally {
      setLoading(null);
    }
  };

  const handleOutsideClick = () => {
    setLastSelected(selected);
    setSelected(null);
  };

  return (
    <div className="w-full h-full p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-[90rem] mx-auto gap-6 relative">
      {cards.map((card) => (
        <div key={card.id} className={cn(card.className, "")}>
          <motion.div
            onClick={() => handleClick(card)}
            className={cn(
              "relative overflow-hidden cursor-pointer",
              selected?.id === card.id
                ? "rounded-lg absolute inset-0 h-[80vh] w-full md:w-[80%] lg:w-[70%] m-auto z-50 flex justify-center items-center flex-wrap flex-col"
                : lastSelected?.id === card.id
                ? "z-40 rounded-xl h-full w-full"
                : "rounded-xl h-full w-full min-h-[200px]"
            )}
            layoutId={`card-${card.id}`}
            style={{ 
              backgroundColor: card.color,
              opacity: loading === card.id ? 0.7 : 1
            }}
          >
            {loading === card.id ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : selected?.id === card.id ? (
              <SelectedCard selected={selected} />
            ) : (
              <div className="p-8 h-full flex flex-col items-center justify-center text-white">
                <div className="mb-6 text-5xl">
                  {card.icon}
                </div>
                <h3 className="text-2xl font-semibold text-center">{card.title}</h3>
                <p className="mt-4 text-sm text-center opacity-80">Click to generate insights</p>
              </div>
            )}
          </motion.div>
        </div>
      ))}
      <motion.div
        onClick={handleOutsideClick}
        className={cn(
          "absolute h-full w-full left-0 top-0 bg-black opacity-0 z-10",
          selected?.id ? "pointer-events-auto" : "pointer-events-none"
        )}
        animate={{ opacity: selected?.id ? 0.3 : 0 }}
      />
    </div>
  );
};

const SelectedCard = ({ selected }: { selected: Card | null }) => {
  return (
    <div className="bg-transparent h-full w-full flex flex-col justify-end rounded-lg shadow-2xl relative z-[60]">
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 0.6,
        }}
        className="absolute inset-0 h-full w-full bg-black opacity-60 z-10"
      />
      <motion.div
        layoutId={`content-${selected?.id}`}
        initial={{
          opacity: 0,
          y: 100,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          y: 100,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="relative px-8 pb-4 z-[70] text-white"
      >
        {selected?.content}
      </motion.div>
    </div>
  );
};

const Insights = () => {
  // Define insight cards
  const insightCards: Card[] = [
    {
      id: 1,
      type: "opportunity",
      title: "Marketing Opportunities",
      content: (
        <div className="space-y-4 py-4">
          <h2 className="text-2xl font-bold">Marketing Opportunities</h2>
          <p>Click to analyze essays for potential marketing opportunities and growth strategies.</p>
          <p className="text-sm opacity-70">Powered by AI analysis of expert marketing essays.</p>
        </div>
      ),
      className: "col-span-1 row-span-1",
      thumbnail: "",
      color: "#4CAF50",
      icon: <TrendingUp size={36} />
    },
    {
      id: 2,
      type: "alert",
      title: "Market Warnings",
      content: (
        <div className="space-y-4 py-4">
          <h2 className="text-2xl font-bold">Market Warnings</h2>
          <p>Click to identify potential risks and pitfalls mentioned in marketing expert essays.</p>
          <p className="text-sm opacity-70">Powered by AI analysis of expert marketing essays.</p>
        </div>
      ),
      className: "col-span-1 row-span-1",
      thumbnail: "",
      color: "#F44336",
      icon: <AlertTriangle size={36} />
    },
    {
      id: 3,
      type: "insight",
      title: "Marketing Insights",
      content: (
        <div className="space-y-4 py-4">
          <h2 className="text-2xl font-bold">Marketing Insights</h2>
          <p>Click to discover key insights and observations from marketing expert essays.</p>
          <p className="text-sm opacity-70">Powered by AI analysis of expert marketing essays.</p>
        </div>
      ),
      className: "col-span-1 row-span-1",
      thumbnail: "",
      color: "#2196F3",
      icon: <Lightbulb size={36} />
    },
    {
      id: 4,
      type: "recommendation",
      title: "Recommendations",
      content: (
        <div className="space-y-4 py-4">
          <h2 className="text-2xl font-bold">Recommendations</h2>
          <p>Click to get actionable recommendations based on marketing expert essays.</p>
          <p className="text-sm opacity-70">Powered by AI analysis of expert marketing essays.</p>
        </div>
      ),
      className: "col-span-1 row-span-1",
      thumbnail: "",
      color: "#9C27B0",
      icon: <Target size={36} />
    },
    {
      id: 5,
      type: "success",
      title: "Success Stories",
      content: (
        <div className="space-y-4 py-4">
          <h2 className="text-2xl font-bold">Success Stories</h2>
          <p>Click to explore successful marketing strategies mentioned in expert essays.</p>
          <p className="text-sm opacity-70">Powered by AI analysis of expert marketing essays.</p>
        </div>
      ),
      className: "col-span-1 row-span-1",
      thumbnail: "",
      color: "#FF9800",
      icon: <CheckCircle size={36} />
    },
    {
      id: 6,
      type: "analysis",
      title: "Trend Analysis",
      content: (
        <div className="space-y-4 py-4">
          <h2 className="text-2xl font-bold">Trend Analysis</h2>
          <p>Click to analyze emerging trends and patterns from marketing expert essays.</p>
          <p className="text-sm opacity-70">Powered by AI analysis of expert marketing essays.</p>
        </div>
      ),
      className: "col-span-1 row-span-1",
      thumbnail: "",
      color: "#607D8B",
      icon: <Brain size={36} />
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Marketing Essay Insights</h1>
          <p className="text-muted-foreground">
            Click on a card to generate AI-powered insights from marketing expert essays
          </p>
        </div>
      </div>

      {/* Card Grid */}
      <LayoutGrid cards={insightCards} />
      
      {/* Source Information */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Insights generated from essays by Tim Davidson, Stan Woods, Silvio, Richard van der Blom, April Dunford, and others</p>
      </div>
    </div>
  );
};

export default Insights;